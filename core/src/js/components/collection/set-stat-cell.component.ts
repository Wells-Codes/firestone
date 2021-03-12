import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
	selector: 'set-stat-cell',
	styleUrls: [
		`../../../css/global/scrollbar.scss`,
		`../../../css/global/forms.scss`,
		`../../../css/global/toggle.scss`,
		`../../../css/component/collection/set-stat-cell.component.scss`,
	],
	template: `
		<!-- TODO: add formatting for thousands -->
		<div class="set-stat-cell">
			<div class="text">{{ text }}</div>
			<div class="value" [ngClass]="{ 'completed': current === total }">
				<div class="item">{{ current }}</div>
				<div class="item">/</div>
				<div class="item">{{ total }}</div>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetStatCellComponent {
	@Input() text: string;
	@Input() current: number;
	@Input() total: number;
}