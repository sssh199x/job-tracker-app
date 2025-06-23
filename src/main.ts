import { bootstrapApplication } from '@angular/platform-browser';
import { appConfiguration } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfiguration)
  .catch((err) => console.error(err));
