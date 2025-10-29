import {
	Engine,
	Scene,
	FreeCamera,
	Vector3,
	HemisphericLight,
	MeshBuilder,
	StandardMaterial,
	Color3,
	Mesh,
	DirectionalLight,
	ShadowGenerator,
	ActionManager,
	ExecuteCodeAction,
} from "@babylonjs/core";
import "@babylonjs/loaders";

interface GameState {
	score: number;
	isRunning: boolean;
	isGameOver: boolean;
	speed: number;
	lives: number;
}

interface Obstacle {
	mesh: Mesh;
	position: Vector3;
	type: "barrier" | "pit" | "coin" | "powerup";
}

export class BabylonSceneThree {
	private engine: Engine;
	private scene: Scene;
	private camera: FreeCamera | null = null;
	private player: Mesh | null = null;
	private ground: Mesh | null = null;
	private obstacles: Obstacle[] = [];
	private gameState: GameState = {
		score: 0,
		isRunning: false,
		isGameOver: false,
		speed: 20,
		lives: 3
	};

	// Game mechanics
	private readonly lanes = [-4, 0, 4]; // Three lanes for movement
	private currentLane = 1; // Start in middle lane
	private isJumping = false;
	private jumpHeight = 0;
	private jumpSpeed = 0;
	private readonly gravity = -0.8;
	private readonly jumpForce = 0.4;
	private readonly groundLevel = 0;

	// Obstacle generation
	private lastObstacleZ = 0;
	private readonly obstacleSpacing = 15;
	private readonly maxObstacles = 20;

	// Materials
	private playerMaterial: StandardMaterial | null = null;
	private groundMaterial: StandardMaterial | null = null;
	private obstacleMaterial: StandardMaterial | null = null;
	private coinMaterial: StandardMaterial | null = null;
	private powerupMaterial: StandardMaterial | null = null;

	// Lights and shadows
	private light: DirectionalLight | null = null;
	private shadowGenerator: ShadowGenerator | null = null;

	// Event listeners
	private gameStateListeners: Array<(state: GameState) => void> = [];
	
	// Ready state management
	public isReady = false;
	private readonly readyListeners: Array<() => void> = [];

	constructor(private readonly canvas: HTMLCanvasElement, public home?: any) {
		this.canvas.style.touchAction = "none";
		
		// Detectar si es dispositivo móvil
		const isMobile = this.isMobileDevice();
		
		this.engine = new Engine(this.canvas, true, {
			antialias: true,
			adaptToDeviceRatio: true,
			powerPreference: "high-performance",
			preserveDrawingBuffer: false,
			stencil: true
		});
		
		// Configuración de resolución optimizada para ambos dispositivos
		const devicePixelRatio = window.devicePixelRatio || 1;
		
		// Configuración universal: usar DPI con límite inteligente
		const maxScale = isMobile ? 3 : 2.5; // Móviles hasta 3x, desktop hasta 2.5x
		const scaleFactor = Math.min(devicePixelRatio, maxScale);
		
		this.engine.setHardwareScalingLevel(1 / scaleFactor);
		
		setTimeout(() => {
			this.engine.resize();
		}, 50);

		this.scene = new Scene(this.engine);
		this.createMaterials();
		this.createCamera();
		this.createLighting();
		this.createPlayer();
		this.createGround();
		this.setupControls();
		this.startGameLoop();
		
		// Notificar que está listo después de un breve delay
		setTimeout(() => {
			this.notifyReady();
		}, 50);
		
		setTimeout(() => {
			this.resize();
		}, 100);
		
		window.addEventListener("load", () => {
			setTimeout(() => {
				this.resize();
			}, 200);
		});
	}

	private isMobileDevice(): boolean {
		// Detectar dispositivos móviles usando múltiples métodos
		const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
		
		// Verificar user agent
		const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
		const isMobileUA = mobileRegex.test(userAgent.toLowerCase());
		
		// Verificar touch support
		const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		
		// Verificar tamaño de pantalla (móviles típicamente < 768px de ancho)
		const isSmallScreen = window.innerWidth < 768;
		
		// Verificar orientación (solo móviles tienen orientation)
		const hasOrientation = typeof window.orientation !== 'undefined';
		
		return isMobileUA || (hasTouch && isSmallScreen) || hasOrientation;
	}

	private createMaterials(): void {
		// Player material (blue cube)
		this.playerMaterial = new StandardMaterial("playerMaterial", this.scene);
		this.playerMaterial.diffuseColor = new Color3(0.2, 0.6, 1);
		this.playerMaterial.emissiveColor = new Color3(0.1, 0.3, 0.5);

		// Ground material (green)
		this.groundMaterial = new StandardMaterial("groundMaterial", this.scene);
		this.groundMaterial.diffuseColor = new Color3(0.2, 0.8, 0.2);

		// Obstacle material (red)
		this.obstacleMaterial = new StandardMaterial("obstacleMaterial", this.scene);
		this.obstacleMaterial.diffuseColor = new Color3(1, 0.2, 0.2);

		// Coin material (yellow)
		this.coinMaterial = new StandardMaterial("coinMaterial", this.scene);
		this.coinMaterial.diffuseColor = new Color3(1, 1, 0);
		this.coinMaterial.emissiveColor = new Color3(0.3, 0.3, 0);

		// Powerup material (purple)
		this.powerupMaterial = new StandardMaterial("powerupMaterial", this.scene);
		this.powerupMaterial.diffuseColor = new Color3(1, 0, 1);
		this.powerupMaterial.emissiveColor = new Color3(0.3, 0, 0.3);
	}

	private createCamera(): void {
		this.camera = new FreeCamera("camera", new Vector3(0, 8, -15), this.scene);
		this.camera.setTarget(new Vector3(0, 2, 10));
		this.camera.attachControl(this.canvas, true);
	}

	private createLighting(): void {
		// Ambient light
		new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);

		// Directional light for shadows
		this.light = new DirectionalLight("dirLight", new Vector3(0.2, -1, 0.5), this.scene);
		this.light.position = new Vector3(0, 20, -10);
		this.light.intensity = 0.8;

		// Shadow generator
		this.shadowGenerator = new ShadowGenerator(1024, this.light);
		this.shadowGenerator.useExponentialShadowMap = true;
	}

	private createPlayer(): void {
		this.player = MeshBuilder.CreateBox("player", { size: 1.5 }, this.scene);
		this.player.material = this.playerMaterial;
		this.player.position = new Vector3(this.lanes[this.currentLane], 1, 0);

		// Shadows
		if (this.shadowGenerator) {
			this.shadowGenerator.addShadowCaster(this.player);
		}
	}

	private createGround(): void {
		// Create multiple ground segments for infinite effect
		for (let i = 0; i < 10; i++) {
			const ground = MeshBuilder.CreateGround(
				`ground${i}`, 
				{ width: 20, height: 20 }, 
				this.scene
			);
			ground.material = this.groundMaterial;
			ground.position.z = i * 20;
			ground.receiveShadows = true;
		}
	}

	private setupControls(): void {
		// Keyboard controls
		this.scene.actionManager = new ActionManager(this.scene);

		// Move left (A or Left Arrow)
		this.scene.actionManager.registerAction(new ExecuteCodeAction(
			ActionManager.OnKeyDownTrigger,
			(evt) => {
				if ((evt.sourceEvent.key === 'a' || evt.sourceEvent.key === 'A' || evt.sourceEvent.key === 'ArrowLeft') && this.gameState.isRunning) {
					this.moveLeft();
				}
			}
		));

		// Move right (D or Right Arrow)
		this.scene.actionManager.registerAction(new ExecuteCodeAction(
			ActionManager.OnKeyDownTrigger,
			(evt) => {
				if ((evt.sourceEvent.key === 'd' || evt.sourceEvent.key === 'D' || evt.sourceEvent.key === 'ArrowRight') && this.gameState.isRunning) {
					this.moveRight();
				}
			}
		));

		// Jump (Space or W or Up Arrow)
		this.scene.actionManager.registerAction(new ExecuteCodeAction(
			ActionManager.OnKeyDownTrigger,
			(evt) => {
				if ((evt.sourceEvent.key === ' ' || evt.sourceEvent.key === 'w' || evt.sourceEvent.key === 'W' || evt.sourceEvent.key === 'ArrowUp') && this.gameState.isRunning) {
					this.jump();
				}
			}
		));

		// Start/Restart game (Enter)
		this.scene.actionManager.registerAction(new ExecuteCodeAction(
			ActionManager.OnKeyDownTrigger,
			(evt) => {
				if (evt.sourceEvent.key === 'Enter') {
					if (!this.gameState.isRunning) {
						this.startGame();
					}
				}
			}
		));

		// Mobile touch controls
		this.setupTouchControls();
	}

	private setupTouchControls(): void {
		let touchStartX = 0;
		let touchStartY = 0;

		this.canvas.addEventListener('touchstart', (e) => {
			e.preventDefault();
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
		});

		this.canvas.addEventListener('touchend', (e) => {
			e.preventDefault();
			if (!this.gameState.isRunning) {
				this.startGame();
				return;
			}

			const touchEndX = e.changedTouches[0].clientX;
			const touchEndY = e.changedTouches[0].clientY;
			const deltaX = touchEndX - touchStartX;
			const deltaY = touchStartY - touchEndY; // Inverted for natural swipe

			const threshold = 50;

			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				// Horizontal swipe
				if (deltaX > threshold) {
					this.moveRight();
				} else if (deltaX < -threshold) {
					this.moveLeft();
				}
			} else {
				// Vertical swipe
				if (deltaY > threshold) {
					this.jump();
				}
			}
		});
	}

	private moveLeft(): void {
		if (this.currentLane > 0) {
			this.currentLane--;
			this.animatePlayerToLane();
		}
	}

	private moveRight(): void {
		if (this.currentLane < this.lanes.length - 1) {
			this.currentLane++;
			this.animatePlayerToLane();
		}
	}

	private animatePlayerToLane(): void {
		if (!this.player) return;
		
		const targetX = this.lanes[this.currentLane];
		const currentX = this.player.position.x;
		const distance = targetX - currentX;
		
		// Smooth animation to new lane
		const moveSpeed = 0.3;
		const animate = () => {
			if (!this.player) return;
			const remainingDistance = targetX - this.player.position.x;
			if (Math.abs(remainingDistance) > 0.1) {
				this.player.position.x += remainingDistance * moveSpeed;
				requestAnimationFrame(animate);
			} else {
				this.player.position.x = targetX;
			}
		};
		animate();
	}

	private jump(): void {
		if (!this.player) return;
		
		if (!this.isJumping && this.player.position.y <= this.groundLevel + 1) {
			this.isJumping = true;
			this.jumpSpeed = this.jumpForce;
		}
	}

	private updatePlayerMovement(): void {
		if (!this.player) return;
		
		if (this.isJumping) {
			this.jumpHeight += this.jumpSpeed;
			this.jumpSpeed += this.gravity * 0.016; // 60 FPS

			this.player.position.y = this.groundLevel + 1 + this.jumpHeight;

			if (this.player.position.y <= this.groundLevel + 1) {
				this.player.position.y = this.groundLevel + 1;
				this.isJumping = false;
				this.jumpHeight = 0;
				this.jumpSpeed = 0;
			}
		}
	}

	private generateObstacles(): void {
		if (!this.player) return;
		
		const playerZ = this.player.position.z;
		const generateAheadDistance = 100;

		while (this.lastObstacleZ < playerZ + generateAheadDistance) {
			this.lastObstacleZ += this.obstacleSpacing + Math.random() * 10;
			
			// Random obstacle type
			const rand = Math.random();
			let obstacleType: "barrier" | "pit" | "coin" | "powerup";
			
			if (rand < 0.4) {
				obstacleType = "barrier";
			} else if (rand < 0.6) {
				obstacleType = "coin";
			} else if (rand < 0.75) {
				obstacleType = "pit";
			} else {
				obstacleType = "powerup";
			}

			this.createObstacle(obstacleType, this.lastObstacleZ);
		}
	}

	private createObstacle(type: "barrier" | "pit" | "coin" | "powerup", z: number): void {
		let mesh: Mesh;
		const lane = Math.floor(Math.random() * this.lanes.length);
		const x = this.lanes[lane];

		switch (type) {
			case "barrier":
				mesh = MeshBuilder.CreateBox("obstacle", { width: 2, height: 3, depth: 1 }, this.scene);
				mesh.material = this.obstacleMaterial;
				mesh.position = new Vector3(x, 1.5, z);
				break;

			case "pit":
				mesh = MeshBuilder.CreateBox("pit", { width: 3, height: 0.2, depth: 3 }, this.scene);
				mesh.material = this.obstacleMaterial;
				mesh.position = new Vector3(x, -0.1, z);
				break;

			case "coin":
				mesh = MeshBuilder.CreateSphere("coin", { diameter: 1 }, this.scene);
				mesh.material = this.coinMaterial;
				mesh.position = new Vector3(x, 2, z);
				// Rotate coin
				mesh.rotation.y += 0.05;
				break;

			case "powerup":
				mesh = MeshBuilder.CreatePolyhedron("powerup", { size: 0.8 }, this.scene);
				mesh.material = this.powerupMaterial;
				mesh.position = new Vector3(x, 2, z);
				break;
		}

		// Add shadows
		if (this.shadowGenerator) {
			this.shadowGenerator.addShadowCaster(mesh);
		}
		mesh.receiveShadows = true;

		this.obstacles.push({
			mesh: mesh,
			position: mesh.position.clone(),
			type: type
		});
	}

	private updateObstacles(): void {
		if (!this.player) return;
		
		const playerZ = this.player.position.z;

		// Remove obstacles that are too far behind
		this.obstacles = this.obstacles.filter(obstacle => {
			if (obstacle.position.z < playerZ - 30) {
				obstacle.mesh.dispose();
				return false;
			}
			return true;
		});

		// Animate coins and powerups
		this.obstacles.forEach(obstacle => {
			if (obstacle.type === "coin") {
				obstacle.mesh.rotation.y += 0.05;
			} else if (obstacle.type === "powerup") {
				obstacle.mesh.rotation.x += 0.03;
				obstacle.mesh.rotation.y += 0.03;
				obstacle.mesh.position.y = obstacle.position.y + Math.sin(Date.now() * 0.005) * 0.3;
			}
		});
	}

	private checkCollisions(): void {
		if (!this.player) return;
		
		const playerPos = this.player.position;
		const collisionDistance = 1.5;

		this.obstacles.forEach((obstacle, index) => {
			const distance = Vector3.Distance(playerPos, obstacle.mesh.position);
			
			if (distance < collisionDistance) {
				switch (obstacle.type) {
					case "barrier":
					case "pit":
						this.handlePlayerHit();
						break;
					case "coin":
						this.collectCoin();
						obstacle.mesh.dispose();
						this.obstacles.splice(index, 1);
						break;
					case "powerup":
						this.collectPowerup();
						obstacle.mesh.dispose();
						this.obstacles.splice(index, 1);
						break;
				}
			}
		});
	}

	private handlePlayerHit(): void {
		if (!this.player) return;
		
		this.gameState.lives--;
		
		if (this.gameState.lives <= 0) {
			this.gameOver();
		} else {
			// Temporary invincibility or knockback effect
			if (this.obstacleMaterial) {
				this.player.material = this.obstacleMaterial;
			}
			setTimeout(() => {
				if (this.player && this.playerMaterial) {
					this.player.material = this.playerMaterial;
				}
			}, 1000);
		}
		
		this.notifyGameStateChange();
	}

	private collectCoin(): void {
		this.gameState.score += 10;
		this.notifyGameStateChange();
	}

	   private collectPowerup(): void {
		   this.gameState.score += 50;
		   this.gameState.speed = Math.min(this.gameState.speed + 5, 100);
		   this.notifyGameStateChange();
	   }

	private updateCamera(): void {
		if (!this.player || !this.camera) return;
		
		const playerPos = this.player.position;
		this.camera.position.z = playerPos.z - 15;
		this.camera.setTarget(new Vector3(0, 2, playerPos.z + 10));
	}

	private updateGround(): void {
		if (!this.player) return;
		
		const playerZ = this.player.position.z;
		const grounds = this.scene.meshes.filter(mesh => mesh.name.startsWith("ground"));
		
		grounds.forEach(ground => {
			if (ground.position.z < playerZ - 40) {
				ground.position.z += grounds.length * 20;
			}
		});
	}

	private startGameLoop(): void {
		// Activar optimización de Angular al iniciar el bucle de renderizado
		if (this.home && typeof this.home.startGameOptimization === 'function') {
			this.home.startGameOptimization();
		}

		this.engine.runRenderLoop(() => {
			if (this.gameState.isRunning && !this.gameState.isGameOver && this.player) {
				// Move player forward
				this.player.position.z += this.gameState.speed * 0.016;
				
				// Update score based on distance
				this.gameState.score += 1;
				
				// Gradually increase speed
				   if (this.gameState.score % 500 === 0) {
					   this.gameState.speed = Math.min(this.gameState.speed + 2, 100);
				   }

				this.updatePlayerMovement();
				this.generateObstacles();
				this.updateObstacles();
				this.checkCollisions();
				this.updateCamera();
				this.updateGround();
				this.notifyGameStateChange();
			}

			this.scene.render();
		});
	}

	public startGame(): void {
		if (!this.player) return;
		
		this.gameState = {
			score: 0,
			isRunning: true,
			isGameOver: false,
			speed: 10,
			lives: 3
		};

		// Reset player position
		this.player.position = new Vector3(this.lanes[1], 1, 0);
		this.currentLane = 1;
		this.isJumping = false;
		this.jumpHeight = 0;
		this.jumpSpeed = 0;

		// Clear obstacles
		this.obstacles.forEach(obstacle => obstacle.mesh.dispose());
		this.obstacles = [];
		this.lastObstacleZ = 0;

		this.notifyGameStateChange();
	}

	public pauseGame(): void {
		this.gameState.isRunning = false;
		this.notifyGameStateChange();
	}

	public resumeGame(): void {
		this.gameState.isRunning = true;
		this.notifyGameStateChange();
	}

	private gameOver(): void {
		this.gameState.isGameOver = true;
		this.gameState.isRunning = false;
		this.notifyGameStateChange();
	}

	public onGameStateChange(callback: (state: GameState) => void): void {
		this.gameStateListeners.push(callback);
		callback(this.gameState);
	}

	private notifyGameStateChange(): void {
		this.gameStateListeners.forEach(listener => listener(this.gameState));
	}

	public resize(): void {
		// Reconfigurar scaling con la misma lógica
		const isMobile = this.isMobileDevice();
		const devicePixelRatio = window.devicePixelRatio || 1;
		const maxScale = isMobile ? 3 : 2.5;
		const scaleFactor = Math.min(devicePixelRatio, maxScale);
		
		this.engine.setHardwareScalingLevel(1 / scaleFactor);
		this.engine.resize();
		this.scene.render();
	}

	public dispose(): void {
		this.obstacles.forEach(obstacle => obstacle.mesh.dispose());
		this.gameStateListeners.length = 0;
		this.readyListeners.length = 0;
		this.scene.dispose();
		this.engine.dispose();
	}

	public onReady(callback: () => void): void {
		if (this.isReady) {
			callback();
		} else {
			this.readyListeners.push(callback);
		}
	}

	private notifyReady(): void {
		this.isReady = true;
		
		setTimeout(() => {
			this.resize();
		}, 100);
		
		for (const listener of this.readyListeners) {
			listener();
		}
		this.readyListeners.length = 0;
	}
}