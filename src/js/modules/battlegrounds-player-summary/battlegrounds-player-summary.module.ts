import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ColiseumComponentsModule } from '@firestone-hs/coliseum-components';
import { init, Integrations } from '@sentry/browser';
import { CaptureConsole, ExtraErrorData } from '@sentry/integrations';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { BattlegroundsPlayerInfoComponent } from '../../components/battlegrounds/battlegrounds-player-info.component';
import { BattlegroundsPlayerSummaryComponent } from '../../components/battlegrounds/battlegrounds-player-summary.component';
import { DebugService } from '../../services/debug.service';
import { Events } from '../../services/events.service';
import { GenericIndexedDbService } from '../../services/generic-indexed-db.service';
import { OverwolfService } from '../../services/overwolf.service';
import { PreferencesService } from '../../services/preferences.service';
import { SharedModule } from '../shared/shared.module';

init({
	dsn: 'https://53b0813bb66246ae90c60442d05efefe@sentry.io/1338840',
	enabled: process.env.NODE_ENV === 'production',
	release: process.env.APP_VERSION,
	attachStacktrace: true,
	integrations: [
		new Integrations.GlobalHandlers({
			onerror: true,
			onunhandledrejection: true,
		}),
		new ExtraErrorData(),
		new CaptureConsole({
			levels: ['error'],
		}),
	],
});

console.log('version is ' + process.env.APP_VERSION);

@NgModule({
	imports: [
		BrowserModule,
		BrowserAnimationsModule,
		SharedModule,
		FormsModule,
		LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG }),
		ColiseumComponentsModule,
	],
	declarations: [BattlegroundsPlayerSummaryComponent, BattlegroundsPlayerInfoComponent],
	bootstrap: [BattlegroundsPlayerSummaryComponent],
	providers: [DebugService, Events, GenericIndexedDbService, PreferencesService, OverwolfService],
})
export class BattlegroundsPlayerSummaryModule {}
