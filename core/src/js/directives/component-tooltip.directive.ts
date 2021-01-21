import { ConnectedPosition, Overlay, OverlayPositionBuilder, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { ComponentPortal, ComponentType } from '@angular/cdk/portal';
import {
	AfterViewInit,
	ChangeDetectorRef,
	Directive,
	ElementRef,
	HostListener,
	Input,
	OnDestroy,
	ViewRef,
} from '@angular/core';

@Directive({
	selector: '[componentTooltip]',
})
// See https://blog.angularindepth.com/building-tooltips-for-angular-3cdaac16d138
export class ComponentTooltipDirective implements AfterViewInit, OnDestroy {
	private _componentInput: any;
	private _componentType: ComponentType<any>;
	private viewInit = false;

	@Input() set componentType(value: ComponentType<any>) {
		this._componentType = value;
		// console.log('setting component type', value);
		if (value && value !== this._componentType) {
			this.updatePositionStrategy();
		}
	}

	@Input() set componentInput(value: any) {
		this._componentInput = value;
		// console.log('setting component input', value);
		if (value && value !== this._componentInput) {
			this.updatePositionStrategy();
		}
	}

	@Input('componentTooltipPosition') position:
		| 'bottom'
		| 'right'
		| 'left'
		| 'top'
		| 'global-top-center'
		| 'global-top-left' = 'right';

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
		this.viewInit = true;
		this.updatePositionStrategy();
	}

	private updatePositionStrategy() {
		if (!this.viewInit) {
			return;
		}
		if (this.positionStrategy) {
			this.positionStrategy.detach();
			this.positionStrategy.dispose();
			this.positionStrategy = null;
		}
		if (this.overlayRef) {
			this.overlayRef.detach();
			this.overlayRef.dispose();
		}
		const positions: ConnectedPosition[] = this.buildPositions();

		if (this.position === 'global-top-center') {
			this.positionStrategy = this.overlayPositionBuilder
				.global()
				.centerHorizontally()
				.top();
		} else if (this.position === 'global-top-left') {
			this.positionStrategy = this.overlayPositionBuilder
				.global()
				.left()
				.top();
		} else {
			this.positionStrategy = this.overlayPositionBuilder
				// Create position attached to the elementRef
				.flexibleConnectedTo(this.elementRef)
				// Describe how to connect overlay to the elementRef
				.withPositions(positions);
		}

		// Connect position strategy
		this.overlayRef = this.overlay.create({ positionStrategy: this.positionStrategy });

		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	@HostListener('window:beforeunload')
	ngOnDestroy() {
		console.log('on destroy for component tooltip');
		if (this.overlayRef) {
			this.overlayRef.detach();
			if (!(this.cdr as ViewRef)?.destroyed) {
				this.cdr.detectChanges();
			}
		}
	}

	@HostListener('mouseenter')
	onMouseEnter() {
		// Create tooltip portal
		this.tooltipPortal = new ComponentPortal(this._componentType);

		// Attach tooltip portal to overlay
		const tooltipRef = this.overlayRef.attach(this.tooltipPortal);

		// Pass content to tooltip component instance
		tooltipRef.instance.config = this._componentInput;

		this.positionStrategy.apply();
		// console.log('created tooltip instance', tooltipRef);
		if (!(this.cdr as ViewRef)?.destroyed) {
			this.cdr.detectChanges();
		}
	}

	@HostListener('mouseleave')
	onMouseLeave() {
		if (this.overlayRef) {
			this.overlayRef.detach();
			if (!(this.cdr as ViewRef)?.destroyed) {
				this.cdr.detectChanges();
			}
		}
	}

	private buildPositions(): ConnectedPosition[] {
		switch (this.position) {
			case 'right':
				return [
					{
						originX: 'end',
						originY: 'center',
						overlayX: 'start',
						overlayY: 'center',
					},
				];
			case 'left':
				return [
					{
						originX: 'start',
						originY: 'center',
						overlayX: 'end',
						overlayY: 'center',
					},
				];
			case 'top':
				return [
					{
						originX: 'center',
						originY: 'top',
						overlayX: 'center',
						overlayY: 'bottom',
					},
				];
			case 'bottom':
				return [
					{
						originX: 'center',
						originY: 'bottom',
						overlayX: 'center',
						overlayY: 'top',
					},
				];
		}
	}
}
