import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiRunner } from './api-runner.service';

@NgModule({
	imports: [CommonModule],
	providers: [ApiRunner],
})
export class SharedDataAccessApiRunnerModule {}
