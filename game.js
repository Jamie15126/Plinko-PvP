const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let canvasScale = 1;
const BASE_WIDTH = 600;
const BASE_HEIGHT = 675;
const slotBounces = [];

canvas.width = 600;
canvas.height = 675;

const FIXED_FPS = 60;
const FRAME_TIME = 1000 / FIXED_FPS;
const GRAVITY = 0.4 * (60 / FIXED_FPS);
const BOUNCE = 0.6;
const FRICTION = 0.98;
const PEG_RADIUS = 5;
const BALL_RADIUS = 8;
const BOOST_LINE = 350;
const BOOST_LINE_UPPER = 150;
const BOOST_FORCE = 8 * (60 / FIXED_FPS);

const audio_plink = new Audio("sounds/plink.mp3");
const audio_plink_small = new Audio("sounds/plink_small.mp3");
const audio_plink_small2 = new Audio("sounds/plink_small2.mp3");
const audio_money = new Audio("sounds/money.mp3");
const audio_loss = new Audio("sounds/loss.mp3");
const audio_loss1 = new Audio("sounds/loss1.mp3");
const audio_loss2 = new Audio("sounds/loss2.mp3");
const audio_loss3 = new Audio("sounds/loss3.mp3");
const audio_loss4 = new Audio("sounds/loss4.mp3");
const audio_loss5 = new Audio("sounds/loss5.mp3");
const audio_sad = new Audio("sounds/sad.mp3");
const audio_win = new Audio("sounds/win.mp3");
const audio_moving_stone = new Audio("sounds/moving-stone.mp3");

let masterVolume = 1.0;

const audioSlider = document.getElementById("audio-slider");
const audioValue = document.getElementById("audio-value");

audioSlider.addEventListener("input", () => {
    masterVolume = audioSlider.value / 100;
    audioValue.textContent = audioSlider.value;
});

function playRandomPlink() {
  let sound;
  if (Math.random() < 0.5) {
      sound = audio_plink_small.cloneNode();
  } else {
      sound = audio_plink_small2.cloneNode();
  }
  sound.volume = masterVolume;
  sound.play();
}

function playMoneySound() {
  let money = audio_money.cloneNode();
  money.volume = masterVolume;
  money.play();
}

function playCenterSound() {
  let center = audio_loss.cloneNode();
  center.volume = masterVolume;
  center.play();
}

function playSad() {
  let sad = audio_sad.cloneNode();
  sad.volume = masterVolume / 4;
  sad.play();
}

function playWin() {
  let win = audio_win.cloneNode();
  win.volume = masterVolume;
  win.play();
}

function playMovingStone() {
  let stone = audio_moving_stone.cloneNode();
  stone.volume = masterVolume / 2;
  stone.play();
}

function playRandomLoss() {
  let loss;
  let randomNumber = Math.random();
  if (randomNumber < 0.2) {
      loss = audio_loss1.cloneNode();
  } else if (randomNumber < 0.4) {
      loss = audio_loss2.cloneNode();
  } else if (randomNumber < 0.6) {
      loss = audio_loss3.cloneNode();
  } else if (randomNumber < 0.8) {
      loss = audio_loss4.cloneNode();
  } else {
      loss = audio_loss5.cloneNode();
  }
  loss.volume = masterVolume / 2;
  loss.play();
}

const pegs = [];
let activeBalls = [];
let boostUsed = {};
let currentBet = 0;

let redBalance = 500;
let blueBalance = 500;
let pot = 0;
let houseTotal = 0;

let lastTime = 0;
let accumulatedTime = 0;
let animationFrameId = null;
let isAnimationRunning = false;

const slotConfig = [
    { id: -5, type: 'jackpot', team: 'red', label: 'P' },
    { id: -4, type: 'points', team: 'red', takePercent: 50, givePercent: 10 },
    { id: -3, type: 'points', team: 'red', takePercent: 40, givePercent: 20 },
    { id: -2, type: 'points', team: 'red', takePercent: 30, givePercent: 30 },
    { id: -1, type: 'points', team: 'red', takePercent: 20, givePercent: 40 },
    { id: 0, type: 'center', label: 'C' },
    { id: 1, type: 'points', team: 'blue', takePercent: 20, givePercent: 40 },
    { id: 2, type: 'points', team: 'blue', takePercent: 30, givePercent: 30 },
    { id: 3, type: 'points', team: 'blue', takePercent: 40, givePercent: 20 },
    { id: 4, type: 'points', team: 'blue', takePercent: 50, givePercent: 10 },
    { id: 5, type: 'jackpot', team: 'blue', label: 'P' }
];

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        dropBothBalls();
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        boost('b_left');
        updateUI();
    } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        boost('b_right');
        updateUI();
    } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        boost('b_up');
        updateUI();
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        boost('b_down');
        updateUI();
    } else if (e.code === 'KeyA') {
        e.preventDefault();
        boost('r_left');
        updateUI();
    } else if (e.code === 'KeyD') {
        e.preventDefault();
        boost('r_right');
        updateUI();
    } else if (e.code === 'KeyW') {
        e.preventDefault();
        boost('r_up');
        updateUI();
    } else if (e.code === 'KeyS') {
        e.preventDefault();
        boost('r_down');
        updateUI();
    }
});

document.getElementById('betAmount').addEventListener('input', function() {
    const bet = Math.max(1, parseInt(this.value) || 1);
    document.getElementById('betDisplay').textContent = bet;
});

function initPegs() {
    const rows = 12;
    const startY = 100;
    const rowSpacing = 45;
    const pegSpacing = 45;

    for (let row = 0; row < rows; row++) {
        const pegsInRow = row + 3;
        const rowWidth = (pegsInRow - 1) * pegSpacing;
        const startX = (canvas.width - rowWidth) / 2;

        for (let i = 0; i < pegsInRow; i++) {
            pegs.push({
                x: startX + i * pegSpacing,
                y: startY + row * rowSpacing,
                radius: PEG_RADIUS
            });
        }
    }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function toggleHousePanel() {
  const panel = document.getElementById('housePanel');
  panel.classList.toggle('open');
  playMovingStone();
}

class Ball {
    constructor(x, y, team, id) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = 0;
        this.radius = BALL_RADIUS;
        this.team = team;
        this.color = team === 'red' ? '#ff6b6b' : '#4ecdc4';
        this.active = true;
        this.id = id;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.vy += GRAVITY;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.x += this.vx;
        this.y += this.vy;

        pegs.forEach(peg => {
            const dx = this.x - peg.x;
            const dy = this.y - peg.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = this.radius + peg.radius;

            if (dist < minDist) {
                const angle = Math.atan2(dy, dx);
                const targetX = peg.x + Math.cos(angle) * minDist;
                const targetY = peg.y + Math.sin(angle) * minDist;

                this.x = targetX;
                this.y = targetY;

                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = Math.cos(angle) * speed * BOUNCE;
                this.vy = Math.sin(angle) * speed * BOUNCE;

                const impactThreshold = 0.5;
                const maxSpeed = 10;
                let t = Math.min(1, Math.max(0, speed / maxSpeed));
                const volume = t * t;

                if (speed >= impactThreshold) {
                    audio_plink_small.volume = volume * masterVolume;
                    audio_plink_small.currentTime = 0;
                    playRandomPlink();
                }
            }
        });

        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -BOUNCE;
        } else if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -BOUNCE;
        }

        if (this.y + this.radius > canvas.height - 50) {
            this.y = canvas.height - 50 - this.radius;
            this.vy = 0;
            this.vx *= 0.8;

            if (Math.abs(this.vx) < 0.5 && Math.abs(this.vy) < 0.5) {
                if (this.active) {
                    const slotWidth = canvas.width / slotConfig.length;
                    const clampedX = Math.max(0, Math.min(canvas.width - 1, this.x));
                    let slotIndex = Math.floor(clampedX / slotWidth);

                    if (slotIndex < 0) slotIndex = 0;
                    if (slotIndex >= slotConfig.length) slotIndex = slotConfig.length - 1;

                    const slot = slotConfig[slotIndex];
                    handleSlotLanding(slot, this.team);

                    slotBounces.push({ index: slotIndex, startTime: Date.now() });

                    this.active = false;
                    delete boostUsed[this.id];

                    setTimeout(() => {
                      activeBalls = activeBalls.filter(ball => ball !== this);
                      updateUI();
                    }, 100);
                }
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

function handleSlotLanding(slot, team) {
    const bet = currentBet;

    if (slot.type === 'jackpot') {
        playWin();
        if (team === 'red') {
            redBalance += pot + bet;
        } else {
            blueBalance += pot + bet;
        }
        showMessage(`JACKPOT! +$${pot}`, slot.team);
        pot = 0;
    } else if (slot.type === 'center') {
        playCenterSound();
        const playerReturn = Math.floor(bet * 0.5);
        const potAmount = Math.floor(bet * 0.45);
        const houseAmount = Math.floor(bet * 0.05);

        if (team === 'red') {
            redBalance += playerReturn;
        } else {
            blueBalance += playerReturn;
        }
        pot += potAmount;
        houseTotal += houseAmount;

        showMessage(`+$${potAmount}`, 'neutral');
    } else if (slot.type === 'points') {
        const isOwnSide = (team === slot.team);

        if (isOwnSide) {
            playRandomLoss();
            const giveAmount = Math.floor(bet * slot.givePercent / 100);
            const keepAmount = bet - giveAmount;

            if (team === 'red') {
                redBalance += keepAmount;
                blueBalance += giveAmount;
            } else {
                blueBalance += keepAmount;
                redBalance += giveAmount;
            }

            const potContribution = Math.floor(bet * 0.05);
            pot += potContribution;

            showMessage(`${team.toUpperCase()} gives $${giveAmount}`, team);
        } else {
            playMoneySound();
            const takeAmount = Math.floor(bet * slot.takePercent / 100);

            if (team === 'red') {
                if (blueBalance >= takeAmount) {
                    blueBalance -= takeAmount;
                    redBalance += takeAmount + bet;
                } else {
                    redBalance += bet;
                }
            } else {
                if (redBalance >= takeAmount) {
                    redBalance -= takeAmount;
                    blueBalance += takeAmount + bet;
                } else {
                    blueBalance += bet;
                }
            }

            const potContribution = Math.floor(bet * 0.05);
            pot += potContribution;

            showMessage(`${team.toUpperCase()} takes $${takeAmount}`, team);
        }
    }

    updateUI();
}

function showMessage(text, team) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = text;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.padding = '20px 40px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.fontSize = '24px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.color = 'white';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';

    if (team === 'red') {
        messageDiv.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a6f)';
        messageDiv.style.transform = 'translate(150%, -400%)';
        messageDiv.style.padding = '20px 30px';
    } else if (team === 'blue') {
        messageDiv.style.background = 'linear-gradient(135deg, #4ecdc4, #44a3d5)';
        messageDiv.style.transform = 'translate(-250%, -400%)';
        messageDiv.style.padding = '20px 30px';
    } else {
        messageDiv.style.background = 'rgba(0,0,0,0)';
        messageDiv.style.boxShadow = '0 10px 40px rgba(0,0,0,0.0)';
        messageDiv.style.transform = 'translate(-50%, -450%)';
    }

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.transition = 'opacity 0.5s';
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
    }, 2000);
}

function loseMessage(team) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '10000';
  overlay.style.transition = 'opacity 0.5s';
  overlay.style.opacity = '1';
  overlay.style.fontFamily = 'Arial, sans-serif';

  if (team === 'Red') {
      overlay.style.background = 'rgba(10, 0, 0, 0.85)';
      overlay.style.color = 'rgba(255, 100, 100, 1)';
  } else if (team === 'Blue') {
      overlay.style.background = 'rgba(0, 0, 10, 0.85)';
      overlay.style.color = 'rgba(100, 150, 255, 1)';
  } else {
      overlay.style.background = 'rgba(0,0,0,0.85)';
      overlay.style.color = 'white';
  }

  const messageDiv = document.createElement('div');
  messageDiv.textContent = `${team} Team Ran Out Of Money :(`;
  messageDiv.style.fontSize = '48px';
  messageDiv.style.fontWeight = 'bold';
  messageDiv.style.textAlign = 'center';
  messageDiv.style.textShadow = '0 0 20px rgba(0,0,0,1)';
  messageDiv.style.padding = '20px 40px';
  messageDiv.style.borderRadius = '15px';
  messageDiv.style.boxShadow = '0 10px 40px rgba(0,0,0,0)';

  overlay.appendChild(messageDiv);
  document.body.appendChild(overlay);

  setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
  }, 4000);
}

function dropBothBalls() {
    if (activeBalls.length > 0) return;

    const bet = Math.max(1, parseInt(document.getElementById('betAmount').value) || 100);

    if (redBalance < bet) {
        loseMessage('Red')
        playSad();
        return;
    }
    if (blueBalance < bet) {
        playSad();
        loseMessage('Blue')
        return;
    }

    redBalance -= bet;
    blueBalance -= bet;
    currentBet = bet;

    const redBallId = Date.now() + 'red';
    const blueBallId = Date.now() + 'blue';

    const redBall = new Ball(canvas.width / 2 - 20, 20, 'red', redBallId);
    const blueBall = new Ball(canvas.width / 2 + 20, 20, 'blue', blueBallId);

    activeBalls.push(redBall, blueBall);
    boostUsed[redBallId] = false;
    boostUsed[blueBallId] = false;

    if (!isAnimationRunning) {
        startAnimation();
    }

    updateUI();
}

function boost(direction) {
    for (const ball of activeBalls) {
        if (!ball.active || boostUsed[ball.id] || ball.y > BOOST_LINE || ball.y < BOOST_LINE_UPPER) continue;

        if (direction === 'b_left' && ball.team === 'blue') {
            ball.vx -= BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'blue');
            break;
        } else if (direction === 'b_right' && ball.team === 'blue') {
            ball.vx += BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'blue');
            break;
        } else if (direction === 'b_up' && ball.team === 'blue') {
            ball.vy -= BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'blue');
            break;
        } else if (direction === 'b_down' && ball.team === 'blue') {
            ball.vy += BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'blue');
            break;
        } else if (direction === 'r_left' && ball.team === 'red') {
            ball.vx -= BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'red');
            break;
        } else if (direction === 'r_right' && ball.team === 'red') {
            ball.vx += BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'red');
            break;
        } else if (direction === 'r_up' && ball.team === 'red') {
            ball.vy -= BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'red');
            break;
        } else if (direction === 'r_down' && ball.team === 'red') {
            ball.vy += BOOST_FORCE;
            boostUsed[ball.id] = true;
            showMessage('BOOST!', 'red');
            break;
        }
    }
}

function reset() {
    activeBalls = [];
    boostUsed = {};
    redBalance = 500;
    blueBalance = 500;
    pot = 0;
    updateUI();
}

function setBalance() {
    const amount = parseInt(document.getElementById('house-amount').value) || 0;
    const team = document.getElementById('house-teams').value;

    if (team === 'red') {
        redBalance = amount;
    } else if (team === 'blue') {
        blueBalance = amount;
    }
    updateUI();
}

function updateUI() {
    document.getElementById('redBalance').textContent = '$' + redBalance;
    document.getElementById('blueBalance').textContent = '$' + blueBalance;
    document.getElementById('potAmount').textContent = '$' + pot;
    document.getElementById('house-bal').textContent = '$' + houseTotal;

    const bet = Math.max(1, parseInt(document.getElementById('betAmount').value) || 100);
    const dropBtn = document.getElementById('dropBtn');

    dropBtn.disabled = activeBalls.length > 0 ||
        redBalance < bet ||
        blueBalance < bet;

    dropBtn.innerHTML = `Start Round ($<span id="betDisplay">${bet}</span> each)`;

    if (activeBalls.length === 0) {
        if (isAnimationRunning) {
            stopAnimation();
        }
    }
}

function resizeCanvas() {
  const targetHeight = window.innerHeight * 0.55;
  const targetWidth = window.innerWidth * 0.4;

  const scaleByHeight = targetHeight / BASE_HEIGHT;
  const scaleByWidth = targetWidth / BASE_WIDTH;

  canvasScale = Math.min(scaleByHeight, scaleByWidth, 1.2);
  canvasScale = Math.max(canvasScale, 0.6);

  canvas.style.width = (BASE_WIDTH * canvasScale) + 'px';
  canvas.style.height = (BASE_HEIGHT * canvasScale) + 'px';

  canvas.width = BASE_WIDTH;
  canvas.height = BASE_HEIGHT;
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);
resizeCanvas();

function drawPegs() {
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

function drawBoostLine() {
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, BOOST_LINE);
    ctx.lineTo(canvas.width, BOOST_LINE);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('', 50, BOOST_LINE - 5);
}

function drawBoostLineUpper() {
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, BOOST_LINE_UPPER);
    ctx.lineTo(canvas.width, BOOST_LINE_UPPER);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('BOOST ZONE', 10, BOOST_LINE_UPPER - 5);
}

function drawSlots() {
  const slotHeight = 50;
  const slotY = canvas.height - slotHeight;
  const slotWidth = canvas.width / slotConfig.length;
  const cornerRadius = 8;

  slotConfig.forEach((slot, i) => {
      const x = i * slotWidth;
      const cx = x + slotWidth / 2;

      let bounceOffset = 0;
      const bounce = slotBounces.find(b => b.index === i);
      if (bounce) {
          const elapsed = Date.now() - bounce.startTime;
          const duration = 300;
          if (elapsed < duration) {
              const progress = elapsed / duration;
              bounceOffset = Math.sin(progress * Math.PI) * 10;
          } else {
              slotBounces.splice(slotBounces.indexOf(bounce), 1);
          }
      }

      let bgColor;
      if (slot.type === 'jackpot') {
          bgColor = slot.team === 'red' ? '#ff6b6b' : '#4ecdc4';
      } else if (slot.type === 'center') {
          bgColor = '#f5a623';
      } else {
          bgColor = slot.team === 'red' ? '#aa4444' : '#2e7d79';
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      roundRect(ctx, x + 2, slotY + 3 - bounceOffset, slotWidth - 4, slotHeight - 3, cornerRadius);
      ctx.fill();

      ctx.fillStyle = bgColor;
      roundRect(ctx, x + 2, slotY - bounceOffset, slotWidth - 4, slotHeight - 6, cornerRadius);
      ctx.fill();

      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      roundRect(ctx, x + 2, slotY - bounceOffset, slotWidth - 4, slotHeight - 6, cornerRadius);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 16px Arial';

      let displayText = '';
      if (slot.type === 'jackpot') {
          displayText = 'P';
      } else if (slot.type === 'center') {
          displayText = 'C';
      } else if (slot.type === 'points') {
          displayText = slot.takePercent + '%';
      }

      ctx.fillText(displayText, cx, slotY + slotHeight / 2 - 2 - bounceOffset);
  });
}

function startAnimation() {
    isAnimationRunning = true;
    lastTime = performance.now();
    accumulatedTime = 0;
    animationFrameId = requestAnimationFrame(gameLoop);
}

function stopAnimation() {
    isAnimationRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function gameLoop(currentTime) {
    if (!isAnimationRunning) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    const maxDelta = 100;
    const safeDelta = Math.min(deltaTime, maxDelta);

    accumulatedTime += safeDelta;

    while (accumulatedTime >= FRAME_TIME) {
        for (const ball of activeBalls) {
            if (ball.active) {
                ball.update(FRAME_TIME / 1000);
            }
        }
        accumulatedTime -= FRAME_TIME;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSlots();
    drawBoostLine();
    drawBoostLineUpper();
    drawPegs();

    for (const ball of activeBalls) {
        if (ball.active) {
            ball.draw();
        }
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

initPegs();
updateUI();
startAnimation();