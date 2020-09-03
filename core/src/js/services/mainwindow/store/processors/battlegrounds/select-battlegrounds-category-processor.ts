import { BattlegroundsCategory } from '../../../../../models/mainwindow/battlegrounds/battlegrounds-category';
import { MainWindowState } from '../../../../../models/mainwindow/main-window-state';
import { NavigationBattlegrounds } from '../../../../../models/mainwindow/navigation/navigation-battlegrounds';
import { NavigationState } from '../../../../../models/mainwindow/navigation/navigation-state';
import { SelectBattlegroundsCategoryEvent } from '../../events/battlegrounds/select-battlegrounds-category-event';
import { Processor } from '../processor';

export class SelectBattlegroundsCategoryProcessor implements Processor {
	public async process(
		event: SelectBattlegroundsCategoryEvent,
		currentState: MainWindowState,
		history,
		navigationState: NavigationState,
	): Promise<[MainWindowState, NavigationState]> {
		const globalCategory = currentState.battlegrounds.globalCategories.find(globalCategory =>
			globalCategory.categories.some(category => category.id === event.categoryId),
		);
		const category: BattlegroundsCategory = globalCategory.categories.find(cat => cat.id === event.categoryId);
		const navigationBattlegrounds = navigationState.navigationBattlegrounds.update({
			currentView: 'list',
			menuDisplayType: 'breadcrumbs',
			selectedGlobalCategoryId: globalCategory.id,
			selectedCategoryId: category.id,
		} as NavigationBattlegrounds);
		// console.log(
		// 	'selecting category',
		// 	globalCategory.name !== category.name ? globalCategory.name + ' ' + category.name : category.name,
		// 	category,
		// 	globalCategory,
		// );
		return [
			null,
			navigationState.update({
				isVisible: true,
				navigationBattlegrounds: navigationBattlegrounds,
				text: globalCategory.name !== category.name ? globalCategory.name + ' ' + category.name : category.name,
				image: null,
			} as NavigationState),
		];
	}
}
