import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverwolfService } from './overwolf.service';

@NgModule({
	imports: [CommonModule],
	providers: [OverwolfService],
	exports: [],
})
export class CommonFeatureOverwolfModule {}