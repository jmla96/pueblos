// Pure 2D Canvas Platformer Game - No Babylon.js required!

interface GameState {
	score: number;
	distance: number;
	isRunning: boolean;
	isGameOver: boolean;
	speed: number;
	lives: number;
}

interface Platform2D {
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
}

interface Obstacle2D {
	x: number;
	y: number;
	width: number;
	height: number;
	type: "spike" | "coin";
	color: string;
	collected?: boolean;
}

interface Player2D {
	x: number;
	y: number;
	width: number;
	height: number;
	velocityX: number;
	velocityY: number;
	isGrounded: boolean;
	color: string;
}

export class CanvasPlatformer2D {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	
	private player: Player2D;
	private platforms: Platform2D[] = [];
	private obstacles: Obstacle2D[] = [];
	
	private gameState: GameState = {
		score: 0,
		distance: 0,
		isRunning: false,
		isGameOver: false,
		speed: 4,
		lives: 3
	};

	// Physics constants
	private gravity = 0.8;
	private jumpForce = -16;
	private groundY = 400;
	
	// Camera
	private cameraX = 0;
	
	// World generation
	private lastPlatformX = 0;
	private lastObstacleX = 0;
	
	// Controls
	private keys: { [key: string]: boolean } = {};
	
	// Game state listeners
	private gameStateListeners: Array<(state: GameState) => void> = [];
	
	// Animation
	private animationId: number | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		
		// Set canvas size
		this.canvas.width = 800;
		this.canvas.height = 500;
		
		// Initialize player
		this.player = {
			x: 100,
			y: this.groundY - 40,
			width: 30,
			height: 40,
			velocityX: 0,
			velocityY: 0,
			isGrounded: false,
			color: '#4A90E2'
		};
		
		this.initializeGame();
	}

	private initializeGame(): void {
		this.generateInitialWorld();
		this.setupControls();
		this.showStartScreen();
	}

	private generateInitialWorld(): void {
		// Create initial ground platforms
		for (let i = 0; i < 20; i++) {
			this.createPlatform(i * 150, this.groundY, 150, 30);
		}
		this.lastPlatformX = 3000;

		// Create floating platforms
		for (let i = 2; i < 15; i++) {
			if (Math.random() < 0.4) {
				const x = i * 200 + Math.random() * 100;
				const y = this.groundY - 80 - Math.random() * 100;
				this.createPlatform(x, y, 100, 20);
			}
		}

		// Create initial obstacles
		for (let i = 0; i < 10; i++) {
			const x = 300 + i * 200 + Math.random() * 100;
			const type = Math.random() < 0.6 ? "coin" : "spike";
			this.createObstacle(x, type);
		}
		this.lastObstacleX = 2300;
	}

	private createPlatform(x: number, y: number, width: number, height: number): void {
		this.platforms.push({
			x, y, width, height,
			color: '#4CAF50'
		});
	}

	private createObstacle(x: number, type: "spike" | "coin"): void {
		if (type === "coin") {
			this.obstacles.push({
				x: x,
				y: this.groundY - 60,
				width: 20,
				height: 20,
				type: "coin",
				color: '#FFD700'
			});
		} else {
			this.obstacles.push({
				x: x,
				y: this.groundY - 30,
				width: 15,
				height: 30,
				type: "spike",
				color: '#FF4444'
			});
		}
	}

	private setupControls(): void {
		// Keyboard controls
		window.addEventListener('keydown', (e) => {
			this.keys[e.code] = true;
			
			if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && this.gameState.isRunning) {
				this.jump();
				e.preventDefault();
			}
			
			if (e.code === 'Enter' && !this.gameState.isRunning) {
				this.startGame();
				e.preventDefault();
			}
		});

		window.addEventListener('keyup', (e) => {
			this.keys[e.code] = false;
		});

		// Touch/click controls
		this.canvas.addEventListener('click', () => {
			if (this.gameState.isRunning) {
				this.jump();
			} else if (!this.gameState.isRunning) {
				this.startGame();
			}
		});

		// Touch controls for mobile
		this.canvas.addEventListener('touchstart', (e) => {
			e.preventDefault();
			if (this.gameState.isRunning) {
				this.jump();
			} else {
				this.startGame();
			}
		});
	}

	private jump(): void {
		if (this.player.isGrounded) {
			this.player.velocityY = this.jumpForce;
			this.player.isGrounded = false;
		}
	}

	public startGame(): void {
		this.gameState = {
			score: 0,
			distance: 0,
			isRunning: true,
			isGameOver: false,
			speed: 4,
			lives: 3
		};
		
		// Reset player position
		this.player.x = 100;
		this.player.y = this.groundY - 40;
		this.player.velocityX = 0;
		this.player.velocityY = 0;
		this.player.isGrounded = false;
		this.cameraX = 0;
		
		// Reset obstacles
		this.obstacles.forEach(o => o.collected = false);
		
		this.notifyGameStateChange();
		this.gameLoop();
	}

	private gameLoop(): void {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
		}
		
		const update = () => {
			if (this.gameState.isRunning) {
				this.updateGame();
			}
			this.render();
			
			if (this.gameState.isRunning || !this.gameState.isGameOver) {
				this.animationId = requestAnimationFrame(update);
			}
		};
		
		update();
	}

	private updateGame(): void {
		this.updatePlayer();
		this.updateCamera();
		this.checkCollisions();
		this.generateContent();
		this.cleanupOldObjects();
		this.updateGameState();
	}

	private updatePlayer(): void {
		// Horizontal movement (automatic forward movement)
		this.player.velocityX = this.gameState.speed;
		this.player.x += this.player.velocityX;

		// Vertical physics
		this.player.velocityY += this.gravity;
		this.player.y += this.player.velocityY;

		// Ground collision
		if (this.player.y + this.player.height >= this.groundY) {
			this.player.y = this.groundY - this.player.height;
			this.player.velocityY = 0;
			this.player.isGrounded = true;
		}

		// Platform collisions
		this.player.isGrounded = false;
		for (const platform of this.platforms) {
			if (this.isColliding(this.player, platform)) {
				if (this.player.velocityY > 0) { // Falling down
					this.player.y = platform.y - this.player.height;
					this.player.velocityY = 0;
					this.player.isGrounded = true;
				}
			}
		}

		// Check if player fell off screen
		if (this.player.y > this.canvas.height + 100) {
			this.gameOver();
		}
	}

	private updateCamera(): void {
		// Follow player with smooth camera
		const targetCameraX = this.player.x - this.canvas.width / 3;
		this.cameraX += (targetCameraX - this.cameraX) * 0.1;
	}

	private checkCollisions(): void {
		for (let i = this.obstacles.length - 1; i >= 0; i--) {
			const obstacle = this.obstacles[i];
			
			if (obstacle.collected) continue;
			
			if (this.isColliding(this.player, obstacle)) {
				if (obstacle.type === "coin") {
					obstacle.collected = true;
					this.gameState.score += 10;
					this.notifyGameStateChange();
				} else if (obstacle.type === "spike") {
					this.hitSpike();
				}
			}
		}
	}

	private isColliding(rect1: any, rect2: any): boolean {
		return rect1.x < rect2.x + rect2.width &&
			   rect1.x + rect1.width > rect2.x &&
			   rect1.y < rect2.y + rect2.height &&
			   rect1.y + rect1.height > rect2.y;
	}

	private hitSpike(): void {
		this.gameState.lives--;
		if (this.gameState.lives <= 0) {
			this.gameOver();
		} else {
			// Bounce back a bit
			this.player.x -= 30;
			this.player.velocityY = this.jumpForce * 0.5;
		}
		this.notifyGameStateChange();
	}

	private generateContent(): void {
		// Generate new platforms
		while (this.lastPlatformX < this.player.x + 1000) {
			// Ground platforms
			this.createPlatform(this.lastPlatformX, this.groundY, 150, 30);
			
			// Random floating platforms
			if (Math.random() < 0.3) {
				const x = this.lastPlatformX + 100 + Math.random() * 100;
				const y = this.groundY - 80 - Math.random() * 120;
				this.createPlatform(x, y, 80 + Math.random() * 40, 20);
			}
			
			this.lastPlatformX += 150;
		}

		// Generate new obstacles
		while (this.lastObstacleX < this.player.x + 1000) {
			const type = Math.random() < 0.7 ? "coin" : "spike";
			this.createObstacle(this.lastObstacleX + 50 + Math.random() * 100, type);
			this.lastObstacleX += 120;
		}
	}

	private cleanupOldObjects(): void {
		const cleanupDistance = this.player.x - 500;

		// Remove old platforms
		this.platforms = this.platforms.filter(p => p.x > cleanupDistance);
		
		// Remove old obstacles
		this.obstacles = this.obstacles.filter(o => o.x > cleanupDistance);
	}

	private updateGameState(): void {
		this.gameState.distance = Math.floor(this.player.x / 50);
		this.gameState.speed = Math.min(8, 4 + this.gameState.distance / 200);
		this.notifyGameStateChange();
	}

	private gameOver(): void {
		this.gameState.isGameOver = true;
		this.gameState.isRunning = false;
		this.notifyGameStateChange();
	}

	private render(): void {
		// Clear canvas
		this.ctx.fillStyle = '#87CEEB';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// Draw mountains in background
		this.drawMountains();

		// Save context for camera transform
		this.ctx.save();
		this.ctx.translate(-this.cameraX, 0);

		// Draw platforms
		this.platforms.forEach(platform => {
			this.ctx.fillStyle = platform.color;
			this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
			
			// Add some texture to platforms
			this.ctx.fillStyle = '#45a049';
			this.ctx.fillRect(platform.x, platform.y, platform.width, 5);
		});

		// Draw obstacles
		this.obstacles.forEach(obstacle => {
			if (obstacle.collected && obstacle.type === "coin") return;
			
			this.ctx.fillStyle = obstacle.color;
			
			if (obstacle.type === "coin") {
				// Draw coin as circle
				this.ctx.beginPath();
				this.ctx.arc(
					obstacle.x + obstacle.width/2, 
					obstacle.y + obstacle.height/2, 
					obstacle.width/2, 
					0, 
					2 * Math.PI
				);
				this.ctx.fill();
			} else {
				// Draw spike as triangle
				this.ctx.beginPath();
				this.ctx.moveTo(obstacle.x + obstacle.width/2, obstacle.y);
				this.ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
				this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
				this.ctx.closePath();
				this.ctx.fill();
			}
		});

		// Draw player
		this.ctx.fillStyle = this.player.color;
		this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
		
		// Add player details
		this.ctx.fillStyle = '#2E6BC7';
		this.ctx.fillRect(this.player.x + 2, this.player.y + 2, this.player.width - 4, 8);

		// Restore context
		this.ctx.restore();

		// Draw UI
		this.drawUI();

		// Draw game states
		if (!this.gameState.isRunning && !this.gameState.isGameOver) {
			this.showStartScreen();
		} else if (this.gameState.isGameOver) {
			this.showGameOverScreen();
		}
	}

	private drawMountains(): void {
		// Background mountains for 2D aesthetic
		const mountainOffset = this.cameraX * 0.3;
		
		this.ctx.fillStyle = '#6B8E23';
		for (let i = 0; i < 5; i++) {
			const x = (i * 200 - mountainOffset) % (this.canvas.width + 200);
			this.ctx.beginPath();
			this.ctx.moveTo(x - 50, this.canvas.height);
			this.ctx.lineTo(x + 50, 200 + Math.sin(i) * 50);
			this.ctx.lineTo(x + 150, this.canvas.height);
			this.ctx.closePath();
			this.ctx.fill();
		}
	}

	private drawUI(): void {
		// Score
		this.ctx.fillStyle = '#333';
		this.ctx.font = 'bold 20px Arial';
		this.ctx.fillText(`Score: ${this.gameState.score}`, 20, 30);
		this.ctx.fillText(`Distance: ${this.gameState.distance}m`, 20, 55);
		
		// Lives
		this.ctx.fillText('Lives: ', 20, 80);
		for (let i = 0; i < this.gameState.lives; i++) {
			this.ctx.fillStyle = '#FF4444';
			this.ctx.fillRect(80 + i * 25, 65, 20, 20);
		}
		
		// Speed indicator
		this.ctx.fillStyle = '#333';
		this.ctx.fillText(`Speed: ${this.gameState.speed.toFixed(1)}`, 20, 105);
	}

	private showStartScreen(): void {
		// Semi-transparent overlay
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		
		// Title
		this.ctx.fillStyle = '#FFF';
		this.ctx.font = 'bold 36px Arial';
		this.ctx.textAlign = 'center';
		this.ctx.fillText('Mountain Runner 2D', this.canvas.width/2, this.canvas.height/2 - 50);
		
		this.ctx.font = '18px Arial';
		this.ctx.fillText('Click or press ENTER to start', this.canvas.width/2, this.canvas.height/2);
		this.ctx.fillText('SPACE/UP/W to jump', this.canvas.width/2, this.canvas.height/2 + 30);
		
		this.ctx.textAlign = 'start';
	}

	private showGameOverScreen(): void {
		// Semi-transparent overlay
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		
		// Game Over text
		this.ctx.fillStyle = '#FF4444';
		this.ctx.font = 'bold 48px Arial';
		this.ctx.textAlign = 'center';
		this.ctx.fillText('GAME OVER', this.canvas.width/2, this.canvas.height/2 - 60);
		
		this.ctx.fillStyle = '#FFF';
		this.ctx.font = '24px Arial';
		this.ctx.fillText(`Final Score: ${this.gameState.score}`, this.canvas.width/2, this.canvas.height/2 - 20);
		this.ctx.fillText(`Distance: ${this.gameState.distance}m`, this.canvas.width/2, this.canvas.height/2 + 10);
		
		this.ctx.font = '18px Arial';
		this.ctx.fillText('Click or press ENTER to restart', this.canvas.width/2, this.canvas.height/2 + 50);
		
		this.ctx.textAlign = 'start';
	}

	public pauseGame(): void {
		this.gameState.isRunning = false;
		this.notifyGameStateChange();
	}

	public resumeGame(): void {
		this.gameState.isRunning = true;
		this.gameLoop();
		this.notifyGameStateChange();
	}

	public restartGame(): void {
		// Clear old content
		this.platforms = [];
		this.obstacles = [];
		this.lastPlatformX = 0;
		this.lastObstacleX = 0;
		
		// Regenerate world
		this.generateInitialWorld();
		this.startGame();
	}

	public onGameStateChange(listener: (state: GameState) => void): void {
		this.gameStateListeners.push(listener);
	}

	private notifyGameStateChange(): void {
		this.gameStateListeners.forEach(listener => listener({...this.gameState}));
	}

	public getGameState(): GameState {
		return {...this.gameState};
	}

	public dispose(): void {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
		}
		
		// Remove event listeners
		window.removeEventListener('keydown', this.setupControls);
		window.removeEventListener('keyup', this.setupControls);
		this.canvas.removeEventListener('click', this.setupControls);
		this.canvas.removeEventListener('touchstart', this.setupControls);
	}
}