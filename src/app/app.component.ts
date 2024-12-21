import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import * as fabric from 'fabric'

@Component({
    selector: 'app-root',
    imports: [FormsModule, DecimalPipe],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
    @ViewChild('canvas', {static: true}) canvasRef!: ElementRef<HTMLCanvasElement>;
    videoElement: HTMLVideoElement = {} as HTMLVideoElement;
    canvas: fabric.Canvas = {} as fabric.Canvas;
    videoObject: fabric.Image = {} as fabric.Image;

    // Video Controls State
    isPlaying: boolean = false;
    videoDuration: number = 0;
    currentTime: number = 0;

    ngAfterViewInit(): void {
        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas = new fabric.Canvas(this.canvasRef.nativeElement, {
            width: 1920,
            height: 1080,
        });

        // Create a video element
        this.videoElement = document.createElement('video');
        this.videoElement.height = 500;
        this.videoElement.width = 500;
        this.videoElement.muted = true;
        this.videoElement.src = 'https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4';

        this.videoElement.onloadedmetadata = () => {
            this.videoDuration = this.videoElement?.duration;
        }

        // Fabric Image from Video
        this.videoObject = new fabric.Image(this.videoElement, {
            height: 500,
            width: 500,
            left: 100,
            top: 100,
            scaleX: 1,
            scaleY: 1,
            selectable: true,
            hasControls: true,
        });

        // Add video object to canvas
        this.canvas.add(this.videoObject);

        // Set initial control position
        this.updateControlsPosition();

        // Update scrubber position during canvas events
        this.canvas.on('object:moving', this.updateControlsPosition.bind(this));
        this.canvas.on('object:scaling', this.updateControlsPosition.bind(this));

        // Start rendering the video frames
        this.renderVideoFrame();
    }

    renderVideoFrame() {
        const render = () => {
            if (this.isPlaying) {
                this.videoObject.setElement(this.videoElement);
                this.canvas.requestRenderAll();
                this.currentTime = this.videoElement.currentTime;
            }
            fabric.util.requestAnimFrame(render);
        };
        render();
    }

    playPauseVideo() {
        if (this.isPlaying) {
            this.videoElement.pause();
        } else {
            this.videoElement.play();
        }
        this.isPlaying = !this.isPlaying;
    }

    onScrubberChange(event: Event) {
        const scrubber = event.target as HTMLInputElement;
        this.videoElement.currentTime = parseFloat(scrubber.value);
        this.currentTime = this.videoElement?.currentTime;
        this.canvas.requestRenderAll();
    }

    updateControlsPosition() {
        const object = this.videoObject;
        const controls = document.getElementById('controls');
        if (controls) {
            controls.style.width = `${ object.width * object.scaleX - 10 }px`;
            controls.style.left = `${ object.left }px`;
            controls.style.top = `${ object.top + object.height * object.scaleY + 10 }px`;
        }
    }
}
