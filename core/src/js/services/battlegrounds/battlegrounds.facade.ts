import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BattlegroundsPersonalStatsHeroDetailsCategory } from '../../models/mainwindow/battlegrounds/categories/battlegrounds-personal-stats-hero-details-category';
import { BgsStats } from '../../models/battlegrounds/stats/bgs-stats';
import { AppUiStoreService } from '../app-ui-store.service';

@Injectable()
export class BattlegroundsFacade {
    battlegroundStats$: Observable<BgsStats>;
    currentHeroId$: Observable<string>;

    constructor(private readonly store: AppUiStoreService) {
        this.currentHeroId$ = this.store.allState$.pipe(
            map(([main, nav]) => (main.battlegrounds.findCategory(nav.navigationBattlegrounds.selectedCategoryId) as BattlegroundsPersonalStatsHeroDetailsCategory)?.heroId)
        )
        this.battlegroundStats$ = this.store.allState$.pipe(
            map(([main, nav]) => main.battlegrounds.stats)
        )
    }
}