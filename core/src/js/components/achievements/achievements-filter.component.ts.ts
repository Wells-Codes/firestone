import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FilterShownAchievementsEvent } from '../../services/mainwindow/store/events/achievements/filter-shown-achievements-event';
import { MainWindowStoreEvent } from '../../services/mainwindow/store/events/main-window-store-event';
import { OverwolfService } from '../../services/overwolf.service';

@Component({
	selector: 'achievements-filter',
	styleUrls: [`../../../css/component/achievements/achievements-filter.component.scss`],
	template: `
		<div class="achievement-filter">
			<label class="search-label">
				<i class="i-30">
					<svg class="svg-icon-fill">
						<use xlink:href="/Files/assets/svg/sprite.svg#search" />
					</svg>
				</i>
				<input
					[formControl]="searchForm"
					(mousedown)="onMouseDown($event)"
					[(ngModel)]="searchString"
					placeholder="Search achievement..."
				/>
			</label>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AchievementsFilterComponent implements AfterViewInit, OnDestroy {
	@Input() searchString: string;
	searchForm = new FormControl();

	private stateUpdater: EventEmitter<MainWindowStoreEvent>;
	private subscription: Subscription;

	constructor(private ow: OverwolfService) {}

	ngAfterViewInit() {
		this.stateUpdater = this.ow.getMainWindow().mainWindowStoreUpdater;
		this.subscription = this.searchForm.valueChanges
			.pipe(debounceTime(200))
			.pipe(distinctUntilChanged())
			.subscribe(data => {
				// console.log('value changed?', data);
				this.onSearchStringChange();
			});
	}

	ngOnDestroy() {
		this.subscription.unsubscribe();
	}

	onSearchStringChange() {
		// console.log('[achievements-filter] searchstring changed', this.searchString);
		this.stateUpdater.next(new FilterShownAchievementsEvent(this.searchString));
	}

	onMouseDown(event: Event) {
		event.stopPropagation();
	}
}
