import { BrowserRouter as Router } from 'react-router-dom'
import Routes from './router'
import { QueryProvider } from './queryProvider'

function App() {
  return (
    <QueryProvider>
      <Router>
        <Routes />
      </Router>
    </QueryProvider>
  )
}

export default App