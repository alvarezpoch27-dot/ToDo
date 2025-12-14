import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { Logger } from './app/core/utils/logger.util';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => new Logger('Main', environment.debug).error('Bootstrap error', err));
