import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter } from '@angular/core';
import { IOption } from 'ng-select';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { DuelsClassFilterType } from '../../../../models/duels/duels-class-filter.type';
import { AppUiStoreService } from '../../../../services/app-ui-store.service';
import { classes, formatClass } from '../../../../services/hs-utils';
import { DuelsTopDecksClassFilterSelectedEvent } from '../../../../services/mainwindow/store/events/duels/duels-top-decks-class-filter-selected-event';
import { MainWindowStoreEvent } from '../../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../../services/overwolf.service';

@Component({
	selector: 'duels-class-filter-dropdown',
	styleUrls: [
		`../../../../../css/global/filters.scss`,
		`../../../../../css/component/app-section.component.scss`,
		`../../../../../css/component/filter-dropdown.component.scss`,
	],
	template: `
		<filter-dropdown
			*ngIf="filter$ | async as value"
			class="duels-class-filter-dropdown"
			[options]="options"
			[filter]="value.filter"
			[placeholder]="value.placeholder"
			[visible]="value.visible"
			(onOptionSelected)="onSelected($event)"
		></filter-dropdown>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelsClassFilterDropdownComponent implements AfterViewInit {
	options: readonly ClassFilterOption[];

	filter$: Observable<{ filter: string; placeholder: string; visible: boolean }>;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(private readonly ow: OverwolfService, private readonly store: AppUiStoreService) {
		this.options = ['all', ...(classes as DuelsClassFilterType[])].map(
			(option) =>
				({
					value: option,
					label: option === 'all' ? 'All classes' : formatClass(option),
				} as ClassFilterOption),
		);
		this.filter$ = this.store
			.listen$(
				([main, nav]) => main.duels.activeTopDecksClassFilter,
				([main, nav]) => nav.navigationDuels.selectedCategoryId,
			)
			.pipe(
				filter(([filter, selectedCategoryId]) => !!filter && !!selectedCategoryId),
				map(([filter, selectedCategoryId]) => ({
					filter: filter,
					placeholder: this.options.find((option) => option.value === filter)?.label,
					visible: [
						'duels-stats',
						'duels-runs',
						'duels-treasures',
						'duels-personal-decks',
						'duels-top-decks',
					].includes(selectedCategoryId),
				})),
				// tap((filter) => cdLog('emitting filter in ', this.constructor.name, filter)),
			);
	}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	onSelected(option: ClassFilterOption) {
		this.stateUpdater.next(new DuelsTopDecksClassFilterSelectedEvent(option.value));
	}
}

interface ClassFilterOption extends IOption {
	value: DuelsClassFilterType;
}