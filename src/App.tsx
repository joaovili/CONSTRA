import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import { PwaProvider } from './lib/PwaProvider'
import Home from './pages/Home'
import Library from './pages/Library'
import Progress from './pages/Progress'
import RoutineDetail from './pages/RoutineDetail'
import SessionPage from './pages/Session'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <PwaProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/biblioteca" element={<Library />} />
              <Route path="/rotina/nova" element={<RoutineDetail />} />
              <Route path="/rotina/:id" element={<RoutineDetail />} />
              <Route path="/sessao/:id" element={<SessionPage />} />
              <Route path="/progresso" element={<Progress />} />
              <Route path="/ajustes" element={<Settings />} />
            </Routes>
          </Layout>
        </PwaProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
