export interface DuelsInfo {
	readonly Wins: number;
	readonly Losses: number;
	readonly Rating: number;
	readonly PaidRating: number;
	readonly DeckList: readonly string[];
	readonly ChosenLoot: number;
	readonly ChosenTreasure: number;
	readonly LootOptionBundles: readonly OptionBundle[];
	readonly TreasureOption: readonly number[];
}

export interface OptionBundle {
	readonly BundleId: number;
	readonly Elements: readonly number[];
}