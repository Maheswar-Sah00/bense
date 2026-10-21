import { useNavigate } from 'react-router-dom'
import { FlowHeader } from '../../components/FlowHeader'
import { Button } from '../../components/ui/Button'
import { useFlow } from '../../state/FlowContext'
import { PhotoCapture } from '../camera/PhotoCapture'
import { COLOUR_GUIDE } from './colourGuide'

export default function PhotoStep() {
  const { colour, setColourPhoto } = useFlow()
  const navigate = useNavigate()

  return (
    <div className="flow">
      <FlowHeader backTo="/" step={1} total={4} title="Take a selfie" />

      <PhotoCapture view="colour" guide={COLOUR_GUIDE} photo={colour.photo} onConfirm={setColourPhoto} poseView="selfie" />

      {colour.photo && (
        <Button block onClick={() => navigate('/colour/starting-colour')}>
          Continue
        </Button>
      )}
    </div>
  )
}
