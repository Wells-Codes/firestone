import {
	AfterContentInit,
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	ViewRef,
} from '@angular/core';
import { Race } from '@firestone-hs/reference-data';
import { IOption } from 'ng-select';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil, tap } from 'rxjs/operators';
import { getTribeName } from '../../../../services/battlegrounds/bgs-utils';
import { LocalizationFacadeService } from '../../../../services/localization-facade.service';
import { BgsTribesFilterSelectedEvent } from '../../../../services/mainwindow/store/events/battlegrounds/bgs-tribes-filter-selected-event';
import { MainWindowStoreEvent } from '../../../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../../../services/overwolf.service';
import { AppUiStoreFacadeService } from '../../../../services/ui-store/app-ui-store-facade.service';
import { cdLog } from '../../../../services/ui-store/app-ui-store.service';
import { arraysEqual } from '../../../../services/utils';
import { AbstractSubscriptionComponent } from '../../../abstract-subscription.component';

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
export class BattlegroundsTribesFilterDropdownComponent
	extends AbstractSubscriptionComponent
	implements AfterContentInit, AfterViewInit {
	options$: Observable<readonly IOption[]>;
	filter$: Observable<{ selected: readonly string[]; placeholder: string; visible: boolean }>;

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;

	constructor(
		private readonly ow: OverwolfService,
		private readonly i18n: LocalizationFacadeService,
		protected readonly store: AppUiStoreFacadeService,
		protected readonly cdr: ChangeDetectorRef,
	) {
		super(store, cdr);
	}

	ngAfterContentInit() {
		this.options$ = this.store
			.listen$(([main, nav, prefs]) => main.battlegrounds.globalStats?.allTribes)
			.pipe(
				distinctUntilChanged((a, b) => arraysEqual(a, b)),
				filter(([allTribes]) => !!allTribes?.length),
				map(([allTribes]) =>
					allTribes
						.map(
							(tribe) =>
								({
									value: '' + tribe,
									label: getTribeName(tribe, this.i18n),
								} as IOption),
						)
						.sort((a, b) => (a.label < b.label ? -1 : 1)),
				),
				// FIXME: Don't know why this is necessary, but without it, the filter doesn't update
				tap((filter) => setTimeout(() => this.cdr.detectChanges(), 0)),
				tap((filter) => cdLog('emitting tribe options in ', this.constructor.name, filter)),
				takeUntil(this.destroyed$),
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
			filter(
				([options, [tribesFilter, allTribes, categoryId, currentView]]) =>
					!!tribesFilter && !!allTribes?.length && !!categoryId && !!currentView,
			),
			distinctUntilChanged((a, b) => arraysEqual(a, b)),
			map(([options, [tribesFilter, allTribes, categoryId, currentView]]) => ({
				selected: !!tribesFilter?.length
					? tribesFilter.map((tribe) => '' + tribe)
					: allTribes.map((tribe) => '' + tribe),
				placeholder: 'All tribes',
				visible:
					!['categories', 'category'].includes(currentView) &&
					!['bgs-category-personal-stats', 'bgs-category-simulator', 'bgs-category-personal-rating'].includes(
						categoryId,
					),
			})),
			// FIXME
			tap((filter) =>
				setTimeout(() => {
					if (!(this.cdr as ViewRef)?.destroyed) {
						this.cdr.detectChanges();
					}
				}, 0),
			),
			tap((filter) => cdLog('emitting filter in ', this.constructor.name, filter)),
			takeUntil(this.destroyed$),
		);
	}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
	}

	onSelected(values: readonly string[]) {
		this.stateUpdater.next(new BgsTribesFilterSelectedEvent((values ?? []).map((value) => +value as Race)));
	}
}
