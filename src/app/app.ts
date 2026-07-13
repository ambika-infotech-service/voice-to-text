import { Component, signal } from '@angular/core';
import { SpeechDemo } from './core/speech/components/speech-demo/speech-demo';

@Component({
  selector: 'app-root',
  imports: [SpeechDemo],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('voice-to-text');
}
