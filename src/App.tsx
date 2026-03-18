import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navigation from './components/common/Navigation'
import Home from './pages/Home'
import Learn from './pages/Learn'
import Patterns from './pages/Patterns'
import Review from './pages/Review'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn/:id" element={<Learn />} />
          <Route path="/learn/custom" element={<Learn />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/review" element={<Review />} />
        </Routes>
        <Navigation />
      </div>
    </BrowserRouter>
  )
}
