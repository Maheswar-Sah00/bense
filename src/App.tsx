import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import DemoAnalysisPage from './features/demo/DemoAnalysisPage'
import DemoHomePage from './features/demo/DemoHomePage'
import DemoScenarioPage from './features/demo/DemoScenarioPage'
import PhotosStep from './features/hair-analysis/PhotosStep'
import ResultsStep from './features/hair-analysis/ResultsStep'
import ViewCaptureStep from './features/hair-analysis/ViewCaptureStep'
import AlternativesStep from './features/hair-colour/AlternativesStep'
import PhotoStep from './features/hair-colour/PhotoStep'
import ResultStep from './features/hair-colour/ResultStep'
import ShadeStep from './features/hair-colour/ShadeStep'
import StartingColourStep from './features/hair-colour/StartingColourStep'
import DashboardPage from './routes/DashboardPage'
import NotFoundPage from './routes/NotFoundPage'
import SettingsPage from './routes/SettingsPage'
import { useFlow } from './state/FlowContext'
import { analysisResumePath } from './state/captureSession'
import { colourResumePath } from './state/flow'

function ResumeColour() {
  return <Navigate to={colourResumePath(useFlow().colour)} replace />
}

function ResumeAnalysis() {
  return <Navigate to={analysisResumePath(useFlow().analysis)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="colour">
          <Route index element={<ResumeColour />} />
          <Route path="photo" element={<PhotoStep />} />
          <Route path="starting-colour" element={<StartingColourStep />} />
          <Route path="shade" element={<ShadeStep />} />
          <Route path="result" element={<ResultStep />} />
          <Route path="alternatives" element={<AlternativesStep />} />
        </Route>
        <Route path="analysis">
          <Route index element={<ResumeAnalysis />} />
          <Route path="photos" element={<PhotosStep />} />
          <Route path="photos/:view" element={<ViewCaptureStep />} />
          <Route path="results" element={<ResultsStep />} />
        </Route>
        <Route path="demo">
          <Route index element={<DemoHomePage />} />
          <Route path="colour/:id" element={<DemoScenarioPage />} />
          <Route path="analysis" element={<DemoAnalysisPage />} />
        </Route>
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
