import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	HostListener,
	Input,
	ViewChild,
	ViewRef,
} from '@angular/core';
import { Label } from 'aws-sdk/clients/cloudhsm';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color } from 'ng2-charts';
import { BgsPlayer } from '../../../models/battlegrounds/bgs-player';
import { BgsPostMatchStats } from '../../../models/battlegrounds/post-match/bgs-post-match-stats';
import { BgsStats } from '../../../models/battlegrounds/stats/bgs-stats';

declare let amplitude: any;

@Component({
	selector: 'bgs-chart-warband-stats',
	styleUrls: [
		`../../../../css/global/reset-styles.scss`,
		`../../../../css/component/battlegrounds/hero-selection/bgs-hero-warband-stats.component.scss`,
		`../../../../css/component/battlegrounds/post-match/bgs-chart-warband-stats.component.scss`,
	],
	template: `
		<div class="legend">
			<div
				class="item average"
				helpTooltip="Average total stats (attack + health) on board at the beginning of each turn's battle (top4 6000+ MMR)"
			>
				<div class="node"></div>
				Average for hero
			</div>
			<div class="item current" helpTooltip="Your values for this run">
				<div class="node"></div>
				Current run
			</div>
		</div>
		<div class="container-1">
			<div style="display: block; position: relative; height: 100%; width: 100%;">
				<canvas
					*ngIf="lineChartData"
					#chart
					baseChart
					[style.width.px]="chartWidth"
					[style.height.px]="chartHeight"
					[datasets]="lineChartData"
					[labels]="lineChartLabels"
					[options]="lineChartOptions"
					[colors]="lineChartColors"
					[legend]="false"
					[chartType]="'line'"
				></canvas>
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BgsChartWarbandStatsComponent {
	@ViewChild('chart', { static: false }) chart: ElementRef;

	chartWidth: number;
	chartHeight: number;
	lineChartData: ChartDataSets[];
	lineChartLabels: Label[];
	lineChartOptions: ChartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		layout: {
			padding: 0,
		},
		scales: {
			xAxes: [
				{
					gridLines: {
						color: '#841063',
					},
					ticks: {
						fontColor: '#D9C3AB',
						fontFamily: 'Open Sans',
						fontStyle: 'normal',
					},
				},
			],
			yAxes: [
				{
					id: 'delta-stats',
					position: 'left',
					gridLines: {
						color: '#40032E',
					},
					ticks: {
						fontColor: '#D9C3AB',
						fontFamily: 'Open Sans',
						fontStyle: 'normal',
						beginAtZero: true,
					},
				},
			],
		},
		tooltips: {
			mode: 'index',
			position: 'nearest',
			intersect: false,
			backgroundColor: '#CE73B4',
			// titleFontSize: 0,
			titleFontFamily: 'Open Sans',
			titleFontColor: '#40032E',
			bodyFontFamily: 'Open Sans',
			bodyFontColor: '#40032E',
			xPadding: 5,
			yPadding: 5,
			caretSize: 10,
			caretPadding: 2,
			cornerRadius: 0,
			displayColors: false,
			enabled: false,
			custom: function(tooltip) {
				// console.log('requesting tooltip', tooltip, this._chart?.canvas?.parentNode);
				// Tooltip Element
				let tooltipEl = document.getElementById('chartjs-tooltip-stats');

				if (!tooltipEl) {
					tooltipEl = document.createElement('div');
					tooltipEl.id = 'chartjs-tooltip-stats';
					tooltipEl.innerHTML = `
					<div class="stats-tooltip">					
						<svg class="tooltip-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9">
							<polygon points="0,0 8,-9 16,0"/>
						</svg>
						<div class="content"></div>
					</div>`;
					this._chart.canvas.parentNode.appendChild(tooltipEl);
					// console.log('adding tooltip el', tooltipEl);
				}
				// 230 is the current tooltip width
				const left = Math.max(
					0,
					Math.min(tooltip.caretX - 110, this._chart.canvas.parentNode.getBoundingClientRect().right - 230),
				);
				const caretOffset = tooltip.caretX - 110 - left;
				// console.log('caretOffset', caretOffset, tooltip.caretX, left);
				// console.log('svg child', tooltipEl.querySelector('.tooltip-arrow'));
				(tooltipEl.querySelector('.tooltip-arrow') as any).style.marginLeft = caretOffset + 'px';

				// Hide if no tooltip
				if (tooltip.opacity === 0) {
					tooltipEl.style.opacity = '0';
					return;
				}

				// Set Text
				if (tooltip.body) {
					// const titleLines = tooltip.title || [];
					// const bodyLines = tooltip.beforeBody;
					// console.log('adding text', tooltip, tooltip.dataPoints);

					const averageDatapoint = tooltip.dataPoints.find(dataset => dataset.datasetIndex === 0);
					const currentRunDatapoint = tooltip.dataPoints.find(dataset => dataset.datasetIndex === 1);
					const innerHtml = `
						<div class="body">
							<div class="section player">
								<div class="subtitle">Current run</div>
								<div class="value">Turn ${currentRunDatapoint.label}</div>
								<div class="value">Stats ${currentRunDatapoint.value}</div>
							</div>
							<div class="section average">
								<div class="subtitle">Average for hero</div>
								<div class="value">Turn ${currentRunDatapoint.label}</div>
								<div class="value">Stats ${averageDatapoint?.value || 'No data'}</div>							
							</div>
						</div>
					`;

					const tableRoot = tooltipEl.querySelector('.content');
					tableRoot.innerHTML = innerHtml;
				}
				// console.log(
				// 	'left position',
				// 	tooltip.caretX - 110,
				// 	this._chart.canvas.parentNode,
				// 	this._chart.canvas.parentNode.getBoundingClientRect(),
				// );
				// Display, position, and set styles for font
				tooltipEl.style.opacity = '1';
				tooltipEl.style.left = left + 'px';
				tooltipEl.style.top = tooltip.caretY + 8 - 100 + 'px';
				// position === 'bottom' ? tooltip.caretY + 8 + 'px' :
				tooltipEl.style.fontFamily = tooltip._bodyFontFamily;
				tooltipEl.style.fontSize = tooltip.bodyFontSize + 'px';
				tooltipEl.style.fontStyle = tooltip._bodyFontStyle;
				tooltipEl.style.padding = tooltip.yPadding + 'px ' + tooltip.xPadding + 'px';

				// Set caret Position
				tooltipEl.classList.remove('above', 'below', 'no-transform');
				tooltipEl.classList.add('top');
			},
		},
	};
	lineChartColors: Color[];

	private _globalStats: BgsStats;
	private _stats: BgsPostMatchStats;
	private _player: BgsPlayer;
	private _visible: boolean;
	private _dirty = true;

	@Input() set globalStats(value: BgsStats) {
		if (value === this._globalStats) {
			return;
		}
		//console.log('setting value', value, this._globalStats);
		this._globalStats = value;
		this.updateInfo();
	}

	@Input() set stats(value: BgsPostMatchStats) {
		if (value === this._stats) {
			return;
		}
		//console.log('setting value', value, this._stats);
		this._stats = value;
		this.updateInfo();
	}

	@Input() set player(value: BgsPlayer) {
		if (value === this._player) {
			return;
		}
		//console.log('setting value', value, this._player);
		this._player = value;
		this.updateInfo();
	}

	@Input() set visible(value: boolean) {
		if (value === this._visible) {
			return;
		}
		this._visible = value;
		if (this._visible) {
			setTimeout(() => window.dispatchEvent(new Event('resize')));
		}
	}

	private updateInfo() {
		if (!this._player || !this._stats || !this._globalStats) {
			return;
		}
		const averageStats: readonly { turn: number; totalStats: number }[] = this._globalStats.heroStats.find(
			stat => stat.id === 'average',
		)?.warbandStats;
		const warbandStats: readonly { turn: number; totalStats: number }[] = this._globalStats.heroStats.find(
			stat => stat.id === this._player.cardId,
		)?.warbandStats;
		if (!averageStats || !warbandStats) {
			return;
		}
		const lastTurn = Math.max(warbandStats.length, this._stats.totalStatsOverTurn.length);
		this.lineChartLabels = [...Array(lastTurn).keys()].map(turn => '' + turn);
		console.log('last turn is', lastTurn, this.lineChartLabels);
		this.lineChartData = [
			{
				data: warbandStats.map(
					stat => stat.totalStats + averageStats.find(avg => avg.turn === stat.turn)?.totalStats || 0,
				),
				label: 'Average stats for hero',
			},
			{
				data: this._stats.totalStatsOverTurn.map(stat => stat.value),
				label: 'This run',
			},
		];
		// console.log('[warband-stats] info computed');
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	constructor(private readonly el: ElementRef, private readonly cdr: ChangeDetectorRef) {
		// this.cdr.detach();
	}

	previousWidth: number;

	@HostListener('window:resize')
	onResize() {
		this._dirty = true;
		this.doResize();
	}

	private doResize() {
		// console.log('resize in stats', this._visible, this._dirty);
		if (!this._visible) {
			this._dirty = true;
			return;
		}
		if (!this._dirty) {
			return;
		}
		const chartContainer = this.el.nativeElement.querySelector('.container-1');
		// console.log('chartContainer', chartContainer);
		const rect = chartContainer?.getBoundingClientRect();
		if (!rect?.width || !rect?.height || !this.chart?.nativeElement?.getContext('2d')) {
			setTimeout(() => {
				this.doResize();
			}, 500);
			return;
		}
		if (rect.width === this.chartWidth && rect.height === this.chartHeight) {
			// console.log('correct container size', this.previousWidth, this.chartWidth, this.chartHeight);
			return;
		}
		// this.previousWidth = rect.width;
		this.chartWidth = rect.width;
		this.chartHeight = rect.height;
		// if (this.chartHeight > rect.height) {
		// 	this.chartHeight = rect.height;
		// 	this.chartWidth = 2 * this.chartHeight;
		// }
		this.lineChartColors = [
			{
				backgroundColor: this.getBackgroundColor(),
				borderColor: '#CE73B4',
				pointBackgroundColor: 'transparent',
				pointBorderColor: 'transparent',
				pointHoverBackgroundColor: 'transparent',
				pointHoverBorderColor: 'transparent',
			},
			{
				backgroundColor: 'transparent',
				borderColor: '#FFB948',
				pointBackgroundColor: 'transparent',
				pointBorderColor: 'transparent',
				pointHoverBackgroundColor: 'transparent',
				pointHoverBorderColor: 'transparent',
			},
		];
		// console.log('setting chart dimensions', this.chartHeight, this.chartWidth);
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
		setTimeout(() => this.doResize(), 200);
	}

	private getBackgroundColor() {
		if (!this.chart?.nativeElement) {
			return;
		}

		const gradient = this.chart.nativeElement
			.getContext('2d')
			.createLinearGradient(0, 0, 0, Math.round(this.chartHeight));
		gradient.addColorStop(0, 'rgba(206, 115, 180, 1)'); // #CE73B4
		gradient.addColorStop(0.4, 'rgba(206, 115, 180, 0.4)');
		gradient.addColorStop(1, 'rgba(206, 115, 180, 0)');
		// console.log('returning gradient', gradient, this.chartHeight);
		return gradient;
	}
}
