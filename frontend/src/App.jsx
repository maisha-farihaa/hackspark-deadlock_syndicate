import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import Availability from './pages/Availability'
import Chat from './pages/Chat'
import Trending from './pages/Trending'
import Profile from './pages/Profile'
import Surge from './pages/Surge'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<Products />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/surge" element={<Surge />} />
      </Routes>
    </BrowserRouter>
  )
}