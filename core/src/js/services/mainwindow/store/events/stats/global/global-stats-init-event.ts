import { GlobalStats } from '../../../../../../models/mainwindow/stats/global/global-stats';
import { MainWindowStoreEvent } from '../../main-window-store-event';

export class GlobalStatsInitEvent implements MainWindowStoreEvent {
	public static eventName(): string {
		return 'GlobalStatsInitEvent';
	}

	constructor(public readonly newState: GlobalStats) {}

	public eventName(): string {
		return 'GlobalStatsInitEvent';
	}

	public isNavigationEvent(): boolean {
		return false;
	}
}
