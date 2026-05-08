import { useState } from 'react';
import { X, TrendingUp, Bell, Target } from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';

export function WelcomeBanner() {
  const { markWelcomeSeen, addSampleTickers } = useOnboarding();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAddSamples() {
    setAdding(true);
    try {
      await addSampleTickers();
      setAdded(true);
      setTimeout(() => {
        markWelcomeSeen();
      }, 2000);
    } catch (error) {
      console.error('Failed to add sample tickers:', error);
      setAdding(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="relative">
        <button
          onClick={markWelcomeSeen}
          className="absolute top-0 right-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold mb-2">Welcome to Street Insights! 🎉</h2>
          <p className="text-blue-100 mb-6">
            Track real-time stock sentiment from social media. Get alerted when mention volume
            spikes before the market moves.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Live Signals</h3>
                <p className="text-sm text-blue-100">Real-time mention spikes across Reddit, Twitter, and news</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Predictions</h3>
                <p className="text-sm text-blue-100">Track price targets and validate credibility</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Alerts</h3>
                <p className="text-sm text-blue-100">Get notified when your tickers spike</p>
              </div>
            </div>
          </div>

          {added ? (
            <div className="bg-white/20 rounded-lg p-4 flex items-center gap-3">
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">NVDA, TSLA, and AAPL added to your watchlist!</p>
                <p className="text-sm text-blue-100">Check out Live Signals to see them in action</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleAddSamples}
              disabled={adding}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding...' : 'Add Sample Tickers (NVDA, TSLA, AAPL)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
