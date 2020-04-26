import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewRef } from '@angular/core';
import { PreferencesService } from '../../services/preferences.service';

@Component({
	selector: 'preference-toggle',
	styleUrls: [
		`../../../css/global/components-global.scss`,
		`../../../css/global/toggle.scss`,
		`../../../css/component/settings/settings-common.component.scss`,
		`../../../css/component/settings/preference-toggle.component.scss`,
	],
	template: `
		<div class="preference-toggle">
			<input hidden type="checkbox" [checked]="value" name="" id="a-01-{{ field }}" (change)="toggleValue()" />
			<label class="toggle" for="a-01-{{ field }}" [ngClass]="{ 'enabled': value }">
				<p class="settings-p">
					{{ label }}
					<i class="info" *ngIf="tooltip">
						<svg>
							<use xlink:href="/Files/assets/svg/sprite.svg#info" />
						</svg>
						<div class="zth-tooltip right">
							<p>{{ tooltip }}</p>
							<svg class="tooltip-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9">
								<polygon points="0,0 8,-9 16,0" />
							</svg>
						</div>
					</i>
				</p>
				<b></b>
			</label>
			<div class="info-message" *ngIf="messageWhenToggleValue && valueToDisplayMessageOn === value">
				<svg class="attention-icon">
					<use xlink:href="/Files/assets/svg/sprite.svg#attention" />
				</svg>
				{{ messageWhenToggleValue }}
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreferenceToggleComponent {
	@Input() field: string;
	@Input() label: string;
	@Input() tooltip: string;
	@Input() messageWhenToggleValue: string;
	@Input() valueToDisplayMessageOn: string | boolean | number;
	@Input() toggleFunction: (newValue: boolean) => void;

	value: boolean;

	constructor(private prefs: PreferencesService, private cdr: ChangeDetectorRef) {
		this.loadDefaultValues();
	}

	toggleValue() {
		this.value = !this.value;
		this.prefs.setValue(this.field, this.value);
		if (this.toggleFunction) {
			this.toggleFunction(this.value);
		}
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
	}

	private async loadDefaultValues() {
		const prefs = await this.prefs.getPreferences();
		this.value = prefs[this.field];
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
	}
}
