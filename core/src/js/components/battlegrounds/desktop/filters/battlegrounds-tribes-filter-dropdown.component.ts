import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter } from '@angular/core';
import { MmrPercentile } from '@firestone-hs/bgs-global-stats';
import { Race } from '@firestone-hs/reference-data';
import { IOption } from 'ng-select';
import { combineLatest, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { getTribeName } from '../../../../services/battlegrounds/bgs-utils';
import { BgsTribesFilterSelectedEvent } from '../../../../services/mainwindow/store/events/battlegrounds/bgs-tribes-filter-selected-event';
import { MainWindowStoreEvent } from '../../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../../services/overwolf.service';
import { AppUiStoreService, cdLog } from '../../../../services/ui-store/app-ui-store.service';

@Component({
	selector: 'battlegrounds-tribes-filter-dropdown',
	styleUrls: [
		`../../../../../css/global/filters.scss`,
		`../../../../../css/component/app-section.component.scss`,
		`../../../../../css/component/filter-dropdown.component.scss`,
	],
	template: `
		<filter-dropdown-multiselect
			*ngIf="filter$ | async as value"
			class="battlegrounds-tribes-filter-dropdown"
			[options]="options$ | async"
			[selected]="value.selected"
			[placeholder]="value.placeholder"
			[visible]="value.visible"
			(onOptionSelected)="onSelected($event)"
		></filter-dropdown-multiselect>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlegroundsTribesFilterDropdownComponent implements AfterViewInit {
	options$: Observable<readonly IOption[]>;
	filter$: Observable<{ selected: readonly string[]; placeholder: string; visible: boolean }>;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(
		private readonly ow: OverwolfService,
		private readonly store: AppUiStoreService,
		private readonly cdr: ChangeDetectorRef,
	) {
		this.options$ = this.store
			.listen$(([main, nav, prefs]) => main.battlegrounds.globalStats?.allTribes)
			.pipe(
				tap((info) => console.debug('global stats', info)),
				filter(([allTribes]) => !!allTribes?.length),
				map(([allTribes]) =>
					allTribes
						.map(
							(tribe) =>
								({
									value: '' + tribe,
									label: getTribeName(tribe),
								} as IOption),
						)
						.sort((a, b) => (a.label < b.label ? -1 : 1)),
				),
				// FIXME: Don't know why this is necessary, but without it, the filter doesn't update
				tap((filter) => setTimeout(() => this.cdr.detectChanges(), 0)),
				tap((filter) => cdLog('emitting tribe options in ', this.constructor.name, filter)),
			);
		this.filter$ = combineLatest(
			this.options$,
			this.store.listen$(
				([main, nav, prefs]) => prefs.bgsActiveTribesFilter,
				([main, nav, prefs]) => main.battlegrounds.globalStats.allTribes,
				([main, nav]) => nav.navigationBattlegrounds.selectedCategoryId,
				([main, nav]) => nav.navigationBattlegrounds.currentView,
			),
		).pipe(
			tap((info) => console.debug('update', info)),
			filter(
				([options, [tribesFilter, allTribes, categoryId, currentView]]) =>
					!!tribesFilter && allTribes?.length && !!categoryId && !!currentView,
			),
			map(([options, [tribesFilter, allTribes, categoryId, currentView]]) => ({
				selected: tribesFilter?.length
					? tribesFilter.map((tribe) => '' + tribe)
					: allTribes.map((tribe) => '' + tribe),
				placeholder: 'All tribes',
				visible:
					!['categories', 'category'].includes(currentView) &&
					!['bgs-category-personal-stats', 'bgs-category-simulator'].includes(categoryId),
			})),
			// FIXME
			tap((filter) => setTimeout(() => this.cdr?.detectChanges(), 0)),
			tap((filter) => cdLog('emitting filter in ', this.constructor.name, filter)),
		);
	}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	onSelected(values: readonly string[]) {
		this.stateUpdater.next(new BgsTribesFilterSelectedEvent(values.map((value) => +value as Race)));
	}
}

export const getBgsRankFilterLabelFor = (percentile: MmrPercentile): string => {
	switch (percentile.percentile) {
		case 100:
			return 'All ranks';
		case 50:
			return `Top 50% (${getNiceMmrValue(percentile.mmr, 2)}+)`;
		case 25:
			return `Top 25% (${getNiceMmrValue(percentile.mmr, 2)}+)`;
		case 10:
			return `Top 10% (${getNiceMmrValue(percentile.mmr, 2)}+)`;
		case 1:
			return `Top 1% (${getNiceMmrValue(percentile.mmr, 1)}+)`;
	}
};

const getNiceMmrValue = (mmr: number, significantDigit: number) => {
	return Math.pow(10, significantDigit) * Math.round(mmr / Math.pow(10, significantDigit));
};