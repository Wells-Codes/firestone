import { ConnectedPosition, Overlay, OverlayPositionBuilder, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { AfterViewInit, ChangeDetectorRef, ComponentRef, Directive, ElementRef, HostListener, Input, OnDestroy, ViewRef } from '@angular/core';
import { CardTooltipComponent } from '../components/tooltip/card-tooltip.component';
import { CardTooltipPositionType } from './card-tooltip-position.type';

@Directive({
	selector: '[cardTooltip]',
})
// See https://blog.angularindepth.com/building-tooltips-for-angular-3cdaac16d138
export class CardTooltipDirective implements AfterViewInit, OnDestroy {
	@Input('cardTooltip') cardId = '';
	@Input('cardTooltipText') cardTooltipText = undefined;
	@Input('cardTooltipPosition') set position(value: CardTooltipPositionType) {
		// console.log('[card-tooltip-directive] setting tooltip position', value);
		if (value !== this._position) {
			this._position = value;
			this.updatePositionStrategy();
		}
	}

	private _position: CardTooltipPositionType;
	private tooltipPortal;
	private overlayRef: OverlayRef;
	private positionStrategy: PositionStrategy;

	constructor(
		private overlayPositionBuilder: OverlayPositionBuilder,
		private elementRef: ElementRef,
		private overlay: Overlay,
		private cdr: ChangeDetectorRef,
	) {}

	ngAfterViewInit() {
		this.cdr.detach();
		this.updatePositionStrategy();
	}

	private updatePositionStrategy() {
		if (this.positionStrategy) {
			this.positionStrategy.detach();
			this.positionStrategy.dispose();
			this.positionStrategy = null;
		}
		if (this.overlayRef) {
			this.overlayRef.detach();
			this.overlayRef.dispose();
		}
		if (this._position === 'none') {
			return;
		}
		let positions: ConnectedPosition[] = [
			{
				originX: 'end',
				originY: 'center',
				overlayX: 'start',
				overlayY: 'center',
			},
			{
				originX: 'start',
				originY: 'center',
				overlayX: 'end',
				overlayY: 'center',
			},
			{
				originX: 'start',
				originY: 'top',
				overlayX: 'end',
				overlayY: 'top',
			},
			{
				originX: 'end',
				originY: 'top',
				overlayX: 'start',
				overlayY: 'top',
			},
		];
		if (this._position === 'left') {
			positions = [
				{
					originX: 'start',
					originY: 'center',
					overlayX: 'end',
					overlayY: 'center',
				},
			];
		} else if (this._position === 'right') {
			positions = [
				{
					originX: 'end',
					originY: 'center',
					overlayX: 'start',
					overlayY: 'center',
				},
			];
		}
		this.positionStrategy = this.overlayPositionBuilder
			// Create position attached to the elementRef
			.flexibleConnectedTo(this.elementRef)
			// Describe how to connect overlay to the elementRef
			.withPositions(positions);
		// console.log('[card-tooltip] elementRef', this.elementRef, positions, this.position);

		// Connect position strategy
		this.overlayRef = this.overlay.create({ positionStrategy: this.positionStrategy });
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
	}

	ngOnDestroy() {
		if (this.overlayRef) {
			this.overlayRef.detach();
			if (!(this.cdr as ViewRef).destroyed) {
				this.cdr.detectChanges();
			}
		}
	}

	@HostListener('mouseenter')
	onMouseEnter() {
		// console.log('mouseenter', this._position);
		if (this._position === 'none') {
			console.log('tooltip deactivated, not showing');
			return;
		}
		// Create tooltip portal
		this.tooltipPortal = new ComponentPortal(CardTooltipComponent);

		// Attach tooltip portal to overlay
		const tooltipRef: ComponentRef<CardTooltipComponent> = this.overlayRef.attach(this.tooltipPortal);

		// Pass content to tooltip component instance
		tooltipRef.instance.cardId = this.cardId;
		tooltipRef.instance.text = this.cardTooltipText;
		this.positionStrategy.apply();
		if (!(this.cdr as ViewRef).destroyed) {
			this.cdr.detectChanges();
		}
	}

	@HostListener('mouseleave')
	onMouseLeave() {
		if (this.overlayRef) {
			this.overlayRef.detach();
			if (!(this.cdr as ViewRef).destroyed) {
				this.cdr.detectChanges();
			}
		}
	}
}
