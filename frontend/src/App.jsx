import { useState } from 'react'
import RunForm from './pages/RunForm.jsx'
import StatusView from './pages/StatusView.jsx'
import ResultView from './pages/ResultView.jsx'

function App() {
  const [step, setStep] = useState('run')
  const [runId, setRunId] = useState(null)

  function handleStarted(id) {
    setRunId(id)
    setStep('status')
  }

  function handleCompleted(id) {
    setStep('result')
  }

  function handleReset() {
    setRunId(null)
    setStep('run')
  }

  return (
    <div className="container">
      {step === 'run' && <RunForm onStarted={handleStarted} />}
      {step === 'status' && <StatusView runId={runId} onCompleted={handleCompleted} />}
      {step === 'result' && <ResultView runId={runId} />}

      {step !== 'run' && (
        <div className="button-row">
          <button onClick={handleReset}>Start New Run</button>
        </div>
      )}
    </div>
  )
}

export default App