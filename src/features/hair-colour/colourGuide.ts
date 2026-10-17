import type { CaptureGuide } from '../camera/PhotoCapture'

export const COLOUR_GUIDE: CaptureGuide = {
  overlay: 'face-card',
  why: 'Stays on this phone until you ask for a reading. Never stored or logged.',
  tips: [
    { icon: 'profile', title: 'Face fills the oval', text: 'Hair down, over your shoulders' },
    { icon: 'card', title: 'White card under your chin', text: 'Plain paper works' },
    { icon: 'sun', title: 'Face soft light', text: 'No flash, no filters' },
  ],
  reviewChecks: [
    'Your face fills most of the width, with hair visible',
    'The white card is visible under your chin',
    'The photo is sharp and not lit from behind',
  ],
}
