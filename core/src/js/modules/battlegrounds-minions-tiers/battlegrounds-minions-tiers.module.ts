import { OverlayModule } from '@angular/cdk/overlay';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ColiseumComponentsModule } from '@firestone-hs/coliseum-components';
import { init, Integrations } from '@sentry/browser';
import { CaptureConsole, ExtraErrorData } from '@sentry/integrations';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { InlineSVGModule } from 'ng-inline-svg';
import { SelectModule } from 'ng-select';
import { ChartsModule } from 'ng2-charts';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { BattlegroundsMinionsTiersOverlayComponent } from '../../components/battlegrounds/minions-tiers/battlegrounds-minions-tiers.component';
import { BattlegroundsMinionsGroupComponent } from '../../components/battlegrounds/minions-tiers/bgs-minions-group.component';
import { BattlegroundsMinionsListComponent } from '../../components/battlegrounds/minions-tiers/minions-list.component';
import { BattlegroundsTribesHighlightComponent } from '../../components/battlegrounds/minions-tiers/tribes-highlight.component';
import { AdService } from '../../services/ad.service';
import { SharedServicesModule } from '../shared-services/shared-services.module';
import { SharedModule } from '../shared/shared.module';

init({
	dsn: 'https://53b0813bb66246ae90c60442d05efefe@o92856.ingest.sentry.io/1338840',
	enabled: process.env.NODE_ENV === 'production',
	release: process.env.APP_VERSION,
	attachStacktrace: true,
	sampleRate: 0.1,
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
		HttpClientModule,
		BrowserAnimationsModule,
		SharedModule,
		SelectModule,
		OverlayModule,
		FormsModule,
		ReactiveFormsModule,
		LoggerModule.forRoot({ level: NgxLoggerLevel.WARN }),
		ChartsModule,
		NgxChartsModule,
		SharedServicesModule.forRoot(),
		ColiseumComponentsModule,
		InlineSVGModule.forRoot(),
	],
	declarations: [
		BattlegroundsMinionsTiersOverlayComponent,
		BattlegroundsMinionsListComponent,
		BattlegroundsMinionsGroupComponent,
		BattlegroundsTribesHighlightComponent,
	],
	entryComponents: [],
	bootstrap: [BattlegroundsMinionsTiersOverlayComponent],
	providers: [AdService],
})
export class BattlegroundsMinionsTiersOverlayModule {}
