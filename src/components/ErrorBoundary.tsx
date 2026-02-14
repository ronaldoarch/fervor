import { Component, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Algo deu errado</h1>
          <p>O app encontrou um erro. Tente recarregar a página.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="error-boundary__btn"
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
