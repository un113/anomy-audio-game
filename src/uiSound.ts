import { assetPath } from './assetPath';

const UI_CLICK_SOUND = assetPath('sounds/ui-click.wav');

let clickAudio: HTMLAudioElement | null = null;

export function playUiClick(): void {
  if (!clickAudio) {
    clickAudio = new Audio(UI_CLICK_SOUND);
    clickAudio.volume = 0.22;
  }

  clickAudio.currentTime = 0;
  void clickAudio.play().catch(() => {
    // Keep the button action usable if audio is unavailable or blocked.
  });
}
