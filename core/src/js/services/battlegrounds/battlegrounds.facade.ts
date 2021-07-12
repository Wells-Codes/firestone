import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import { BattlegroundsPersonalStatsHeroDetailsCategory } from '@models/mainwindow/battlegrounds/categories/battlegrounds-personal-stats-hero-details-category';
import { BgsStats } from '@models/battlegrounds/stats/bgs-stats';
import { BgsHeroStat } from '@models/battlegrounds/stats/bgs-hero-stat';
import { AppUiStoreService, selectMainState } from '../app-ui-store.service';

@Injectable()
export class BattlegroundsFacade {
    battlegroundStats$: Observable<BgsStats>;
    bgsHeroDetailedStats$: Observable<BgsHeroStat>
    currentHeroId$: Observable<string>;

    constructor(private readonly store: AppUiStoreService) {
        // Maps allState$ to what we need
        this.currentHeroId$ = this.store.allState$.pipe(
            map(([main, nav]) => (main.battlegrounds.findCategory(nav.navigationBattlegrounds.selectedCategoryId) as BattlegroundsPersonalStatsHeroDetailsCategory)?.heroId),
            distinctUntilChanged()
        );

        // Uses selectMainState custom pipe to select desired state 
        this.battlegroundStats$ = this.store.allState$.pipe(
            selectMainState(([main, nav]) => main.battlegrounds.stats),
        );

        // Uses listen$ method to get observable with specific portions of state
        this.bgsHeroDetailedStats$ = this.store.listen$(
            ([main, nav]) => (main.battlegrounds.findCategory(nav.navigationBattlegrounds.selectedCategoryId) as BattlegroundsPersonalStatsHeroDetailsCategory)?.heroId,
            ([main, nav]) => main.battlegrounds.stats
        ).pipe(
            tap(([heroId, bgsStats]) => console.log('listen$', heroId, bgsStats)),
            map(([heroId, bgsStats]) => bgsStats.heroStats?.find((stat) => stat.id === heroId)),
            distinctUntilChanged()
        );
    }
}