from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
import yfinance as yf
from scipy.linalg import cholesky
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Financial Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MonteCarloRequest(BaseModel):
    tickers: List[str]
    weights: List[float]
    investment: float
    days: int
    simulations: int


class OptimizeRequest(BaseModel):
    tickers: List[str]
    start_date: str
    end_date: str
    num_portfolios: int = 3000


def _extract_close(data: pd.DataFrame, tickers: List[str]) -> pd.DataFrame:
    """Extract Close prices from yfinance result, compatible with both old and new yfinance."""
    if isinstance(data.columns, pd.MultiIndex):
        # yfinance >= 0.2.x: columns are (field, ticker)
        prices = data["Close"]
    else:
        # older yfinance: flat columns (only happens for single ticker)
        prices = data[["Close"]].copy()
        prices.columns = tickers
        return prices

    if isinstance(prices, pd.Series):
        prices = prices.to_frame()
        prices.columns = tickers
    else:
        # DataFrame — columns are ticker symbols already; keep only requested tickers
        available = [t for t in tickers if t in prices.columns]
        if not available:
            raise ValueError(f"None of the requested tickers found in data. Got columns: {list(prices.columns)}")
        prices = prices[available].copy()
        # Warn if some tickers missing (will surface later)

    return prices


def download_prices(tickers: List[str], period: str = "2y") -> pd.DataFrame:
    try:
        data = yf.download(tickers, period=period, auto_adjust=True, progress=False, threads=False)
        if data.empty:
            raise ValueError("No data returned from yfinance. Check ticker symbols.")
        prices = _extract_close(data, tickers)
        prices = prices.dropna(how="all")
        if prices.empty:
            raise ValueError("All price data is NaN after dropping missing values.")
        return prices
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download data: {str(e)}")


def download_prices_range(tickers: List[str], start_date: str, end_date: str) -> pd.DataFrame:
    try:
        data = yf.download(tickers, start=start_date, end=end_date, auto_adjust=True, progress=False, threads=False)
        if data.empty:
            raise ValueError("No data returned from yfinance. Check ticker symbols and date range.")
        prices = _extract_close(data, tickers)
        prices = prices.dropna(how="all")
        if prices.empty:
            raise ValueError("All price data is NaN after dropping missing values.")
        return prices
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download data: {str(e)}")


@app.post("/api/monte-carlo")
async def monte_carlo(request: MonteCarloRequest):
    if len(request.tickers) != len(request.weights):
        raise HTTPException(status_code=400, detail="Number of tickers must match number of weights")

    weight_sum = sum(request.weights)
    if abs(weight_sum - 1.0) > 0.01:
        raise HTTPException(status_code=400, detail=f"Weights must sum to 1.0, got {weight_sum:.4f}")

    if request.days < 1 or request.days > 3650:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 3650")

    if request.simulations < 1 or request.simulations > 10000:
        raise HTTPException(status_code=400, detail="Simulations must be between 1 and 10000")

    prices = download_prices(request.tickers, period="2y")

    # Validate all tickers are in the data
    missing = [t for t in request.tickers if t not in prices.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing ticker data: {missing}. Available: {list(prices.columns)}")

    prices = prices[request.tickers].dropna()

    # Compute log returns
    log_returns = np.log(prices / prices.shift(1)).dropna()

    if len(log_returns) < 30:
        raise HTTPException(status_code=400, detail="Insufficient historical data for simulation")

    mean_returns = log_returns.mean().values
    cov_matrix = log_returns.cov().values

    weights = np.array(request.weights)
    n_assets = len(request.tickers)
    n_days = request.days
    n_sims = request.simulations
    initial = request.investment

    # Cholesky decomposition for correlated returns
    try:
        L = cholesky(cov_matrix, lower=True)
    except Exception:
        # If cov matrix is not positive definite, add small regularization
        cov_reg = cov_matrix + np.eye(n_assets) * 1e-8
        L = cholesky(cov_reg, lower=True)

    # Run simulations
    all_paths = np.zeros((n_sims, n_days + 1))
    all_paths[:, 0] = initial

    for sim in range(n_sims):
        z = np.random.standard_normal((n_days, n_assets))
        correlated_z = z @ L.T
        daily_returns = mean_returns + correlated_z
        portfolio_returns = daily_returns @ weights
        cumulative = initial * np.exp(np.cumsum(portfolio_returns))
        all_paths[sim, 1:] = cumulative

    final_values = all_paths[:, -1]

    var_95 = float(np.percentile(final_values, 5))
    var_99 = float(np.percentile(final_values, 1))
    expected_return = float(np.mean(final_values))
    worst_case = float(np.min(final_values))
    best_case = float(np.max(final_values))

    # Downsample paths: return at most 100 paths, each with at most 100 points
    max_paths = 100
    max_points = 100

    path_indices = np.linspace(0, n_sims - 1, min(max_paths, n_sims), dtype=int)
    point_indices = np.linspace(0, n_days, min(max_points, n_days + 1), dtype=int)

    sampled_paths = all_paths[np.ix_(path_indices, point_indices)]
    paths_list = sampled_paths.tolist()

    return {
        "paths": paths_list,
        "final_values": final_values.tolist(),
        "var_95": var_95,
        "var_99": var_99,
        "expected_return": expected_return,
        "worst_case": worst_case,
        "best_case": best_case,
        "initial_investment": initial,
    }


@app.post("/api/optimize")
async def optimize_portfolio(request: OptimizeRequest):
    if len(request.tickers) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 tickers for optimization")

    if request.num_portfolios < 100 or request.num_portfolios > 10000:
        raise HTTPException(status_code=400, detail="num_portfolios must be between 100 and 10000")

    prices = download_prices_range(request.tickers, request.start_date, request.end_date)

    missing = [t for t in request.tickers if t not in prices.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing ticker data: {missing}. Available: {list(prices.columns)}")

    prices = prices[request.tickers]
    # Drop rows where any ticker has NaN (require complete data across all tickers)
    prices = prices.dropna()
    daily_returns = prices.pct_change().dropna()

    if len(daily_returns) < 30:
        raise HTTPException(status_code=400, detail="Insufficient data for optimization")

    # Annualize
    mean_returns = daily_returns.mean().values * 252
    cov_matrix = daily_returns.cov().values * 252

    n_assets = len(request.tickers)
    n_portfolios = request.num_portfolios

    # Generate random portfolios using Dirichlet distribution
    weights_matrix = np.random.dirichlet(np.ones(n_assets), size=n_portfolios)

    returns = weights_matrix @ mean_returns
    variances = np.array([w @ cov_matrix @ w for w in weights_matrix])
    volatilities = np.sqrt(variances)
    sharpes = np.where(volatilities > 0, returns / volatilities, 0)

    # Find optimal portfolios
    min_var_idx = np.argmin(volatilities)
    max_sharpe_idx = np.argmax(sharpes)

    def portfolio_stats(weights):
        ret = float(weights @ mean_returns)
        vol = float(np.sqrt(weights @ cov_matrix @ weights))
        sharpe = ret / vol if vol > 0 else 0.0
        return ret, vol, sharpe

    min_var_weights = weights_matrix[min_var_idx]
    max_sharpe_weights = weights_matrix[max_sharpe_idx]

    min_var_ret, min_var_vol, min_var_sharpe = portfolio_stats(min_var_weights)
    max_sharpe_ret, max_sharpe_vol, max_sharpe_sharpe = portfolio_stats(max_sharpe_weights)

    frontier = [
        {
            "volatility": float(volatilities[i]),
            "return": float(returns[i]),
            "sharpe": float(sharpes[i]),
        }
        for i in range(n_portfolios)
    ]

    return {
        "frontier": frontier,
        "min_variance": {
            "weights": {
                request.tickers[i]: float(min_var_weights[i])
                for i in range(n_assets)
            },
            "volatility": min_var_vol,
            "return": min_var_ret,
            "sharpe": min_var_sharpe,
        },
        "max_sharpe": {
            "weights": {
                request.tickers[i]: float(max_sharpe_weights[i])
                for i in range(n_assets)
            },
            "volatility": max_sharpe_vol,
            "return": max_sharpe_ret,
            "sharpe": max_sharpe_sharpe,
        },
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}
