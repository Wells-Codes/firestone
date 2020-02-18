import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { GameEvent } from '../../models/game-event';
import { OverwolfService } from '../../services/overwolf.service';
import { PreferencesService } from '../../services/preferences.service';

declare var amplitude;

@Component({
	selector: 'secrets-helper-widget-icon',
	styleUrls: [
		'../../../css/global/components-global.scss',
		'../../../css/component/secrets-helper/secrets-helper-widget-icon.component.scss',
		`../../../css/themes/decktracker-theme.scss`,
	],
	template: `
		<div class="secrets-helper-widget" [ngClass]="{ 'big': big }" (mouseup)="toggleSecretsHelper($event)">
			<div class="icon idle"></div>
			<div class="icon active"></div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretsHelperWidgetIconComponent implements AfterViewInit {
	@Input() active: boolean;
	big: boolean;

	private windowId: string;
	private deckUpdater: EventEmitter<GameEvent>;
	private draggingTimeout;
	private isDragging: boolean;

	constructor(private logger: NGXLogger, private prefs: PreferencesService, private ow: OverwolfService) {}

	async ngAfterViewInit() {
		this.deckUpdater = this.ow.getMainWindow().deckUpdater;
		this.windowId = (await this.ow.getCurrentWindow()).id;
	}

	toggleSecretsHelper(event: MouseEvent) {
		console.log('toggling', this.isDragging);
		if (this.isDragging) {
			return;
		}
		this.big = true;
		setTimeout(() => (this.big = false), 200);
		this.deckUpdater.next(
			Object.assign(new GameEvent(), {
				type: 'TOGGLE_SECRET_HELPER',
			} as GameEvent),
		);
	}

	@HostListener('mousedown', ['$event'])
	dragMove(event: MouseEvent) {
		this.draggingTimeout = setTimeout(() => {
			this.isDragging = true;
		}, 500);
		this.ow.dragMove(this.windowId, async result => {
			clearTimeout(this.draggingTimeout);
			this.isDragging = false;
			const window = await this.ow.getCurrentWindow();
			if (!window) {
				return;
			}
			this.prefs.updateSecretsHelperWidgetPosition(window.left, window.top);
		});
	}
}
