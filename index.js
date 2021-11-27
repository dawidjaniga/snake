import cloneDeep from 'lodash/cloneDeep'
import createDebug from 'debug'
const debug = createDebug('snake')
localStorage.debug = '*'

const squareWidth = 10
const areaSquareWidth = Math.floor(window.innerHeight / 20)

// Clean Code
// Top to Bottom
// Factory -  Dlaczego fabryka? Czy byly inne wzorce?
// Protected API
createSnakeGame()

function createSnakeGame () {
  showIntroInConsole()
  debug('🚀 Creating Snake Game')

  // Divide and Conquer
  const state = createState()
  const snake = createSnake({ startDirection: 'right' })
  const gameLoop = createGameLoop({ state, snake })
  const userInterface = createUserInterface()
  const gameBehaviors = createGameBehaviors({
    state,
    snake,
    gameLoop,
    userInterface
  })
  const gameInteractions = createGameInteractions({
    snake,
    gameLoop,
    userInterface,
    gameBehaviors
  })

  gameBehaviors.prepareGame()
}

function createState () {
  const stateDebug = debug.extend('state')
  const defaultState = {
    score: 0,
    snake: [
      {
        x: 3,
        y: 7
      },
      {
        x: 2,
        y: 7
      },
      {
        x: 1,
        y: 7
      },
      {
        x: 0,
        y: 7
      }
    ],
    apples: [],
    speed: 220,
    gameInterval: 0
  }
  let state = cloneDeep(defaultState)

  stateDebug(`State initialized 🗂`)
  console.log(state)

  // Module-Reveal Pattern
  // AddyOsmani Ksiązka JS Pattern
  return {
    addScorePoint: () => state.score++,
    getScore: () => state.score,
    getHighscore: () => localStorage.getItem('highscore'),
    setHighscore: value => localStorage.setItem('highscore', value),
    resetState: () => (state = cloneDeep(defaultState)),
    getSnake: () => state.snake,
    setSnake: snake => (state.snake = snake),
    getSnakeHead: () => state.snake[0],
    addSnakePart: () => state.snake.push(state.snake[0]),
    addApple: apple => state.apples.push(apple),
    getApples: () => state.apples,
    removeApple: removingApple =>
      (state.apples = state.apples.filter(
        apple => apple.x !== removingApple.x && apple.y !== removingApple.y
      )),
    getSpeed: () => state.speed,
    setSpeed: value => (state.speed = value),
    getGameInterval: () => state.gameInterval,
    setGameInterval: value => (state.gameInterval = value)
  }
}

function createSnake ({ startDirection }) {
  const snakeDebug = debug.extend('🐍')
  const oppositeDirections = {
    left: 'right',
    up: 'down',
    right: 'left',
    down: 'up'
  }
  let direction = startDirection

  function getNewPosition (currentSnake) {
    const newSnake = cloneDeep(currentSnake)

    if (direction === 'up') {
      newSnake[0].y -= 1
    }

    if (direction === 'right') {
      newSnake[0].x += 1
    }

    if (direction === 'down') {
      newSnake[0].y += 1
    }

    if (direction === 'left') {
      newSnake[0].x -= 1
    }

    for (let i = 1; i < currentSnake.length; i++) {
      newSnake[i] = currentSnake[i - 1]
    }
    return newSnake
  }

  function changeDirection (newDirection) {
    if (oppositeDirections[direction] !== newDirection) {
      direction = newDirection
      snakeDebug(`New direction ${direction}`)
    }
  }

  function resetDirection () {
    direction = startDirection
  }

  return {
    getNewPosition,
    changeDirection,
    resetDirection
  }
}

function createGameInteractions ({
  userInterface,
  snake,
  gameBehaviors,
  gameLoop
}) {
  const keyboard = createAkaiMpd18Controller()
  // const keyboard = createKeyboardController()
  const snakeMoveDirections = ['left', 'right', 'up', 'down']

  snakeMoveDirections.forEach(direction =>
    keyboard.onClick(direction, () => snake.changeDirection(direction))
  )

  userInterface.onStartClick(() => {
    userInterface.hideStart()
    userInterface.showPlayingField()
    setTimeout(gameBehaviors.startGame, 500)
  })

  userInterface.onRestartClick(() => {
    gameBehaviors.prepareGame()
    userInterface.showPlayingField()
    setTimeout(gameBehaviors.startGame, 500)
  })

  gameLoop.onSnakeCollision(() => {
    gameBehaviors.stopGame()
  })

  gameLoop.onSnakeEatApple(apple => {
    gameBehaviors.eatApple(apple)
  })
}

function createGameLoop ({ state, snake }) {
  const loopDebug = debug.extend('loop')
  const canvas = createCanvas({ state })
  const collisionDetector = createCollisionDetector({ state })
  const handlers = {
    onSnakeCollision: () => {},
    onSnakeEatApple: () => {}
  }

  function startGameInterval () {
    state.setGameInterval(setInterval(clock, state.getSpeed()))
    canvas.startRendering()
  }

  function stopGameInterval () {
    clearInterval(state.getGameInterval())
    canvas.stopRendering()
  }

  function clock () {
    // Uncomment only to see how clock works
    loopDebug('Tick. Checking what changed...')
    state.setSnake(snake.getNewPosition(state.getSnake()))
    const appleOnSnakeHead = collisionDetector.snakeHeadTouchingAnyApple()

    if (collisionDetector.snakeEatHimself()) {
      loopDebug('Snake collision 💥')
      handlers.onSnakeCollision()
    }

    if (collisionDetector.headTouchingBoundaries()) {
      loopDebug('Snake went outside the field 🚪')
      // handlers.onSnakeCollision()
    }

    if (appleOnSnakeHead) {
      loopDebug('Snake eat the apple 🍎')
      handlers.onSnakeEatApple(appleOnSnakeHead)
    }
  }

  return {
    start: startGameInterval,
    stop: stopGameInterval,
    onSnakeCollision: handler => (handlers.onSnakeCollision = handler),
    onSnakeEatApple: handler => (handlers.onSnakeEatApple = handler)
  }
}

function createCollisionDetector ({ state }) {
  function snakeEatHimself () {
    const head = state.getSnakeHead()
    let result = false

    state
      .getSnake()
      .slice(1)
      .some(part => (result = part.x === head.x && part.y === head.y))
    return result
  }

  function headTouchingBoundaries () {
    const head = state.getSnakeHead()

    return (
      head.x < 0 ||
      head.x >= areaSquareWidth ||
      head.y < 0 ||
      head.y >= areaSquareWidth
    )
  }

  function snakeHeadTouchingAnyApple () {
    const head = state.getSnakeHead()
    let foundApple

    state.getApples().some(apple => {
      if (apple.x === head.x && apple.y === head.y) {
        foundApple = apple
        return true
      }
    })

    return foundApple
  }

  return {
    snakeEatHimself,
    headTouchingBoundaries,
    snakeHeadTouchingAnyApple
  }
}

function createGameBehaviors ({ state, userInterface, gameLoop, snake }) {
  const maxSpeed = 40
  const speedStep = 2

  function prepareGame () {
    state.resetState()
    userInterface.setScore(state.getScore())
    userInterface.setHighscore(state.getHighscore())
    userInterface.hideGameover()
    userInterface.hideCongratulations()
    userInterface.hidePlayingField()
  }

  function startGame () {
    debug('Starting game')
    addRandomApple()
    gameLoop.start()
  }

  function stopGame () {
    const score = state.getScore()
    const highscore = state.getHighscore()

    gameLoop.stop()
    snake.resetDirection()
    userInterface.setYourScore(score)

    if (score > highscore) {
      state.setHighscore(score)
      userInterface.showCongratulations()
    }

    userInterface.showGameover()
    debug('🏁 Game over. Your result', score)
  }

  function eatApple (eatenApple) {
    state.removeApple(eatenApple)
    state.addSnakePart()
    state.addScorePoint()
    state.setSpeed(calculateSpeedBasedOnScore(state.getScore()))

    userInterface.setScore(state.getScore())
    gameLoop.stop()
    gameLoop.start()
    addRandomApple()

    debug('➕ Point added. New score: ', state.getScore())
  }

  function addRandomApple () {
    state.addApple({
      x: getRandomInt(0, areaSquareWidth - 1),
      y: getRandomInt(0, areaSquareWidth - 1)
    })
  }

  function calculateSpeedBasedOnScore (score) {
    const speed = state.getSpeed() - score * speedStep
    const newSpeed = speed < maxSpeed ? maxSpeed : speed
    console.groupEnd('Snake with speed ', speed)
    console.group('Snake with speed ', newSpeed)
    return newSpeed
  }

  return {
    prepareGame,
    startGame,
    stopGame,
    eatApple
  }
}

function createUserInterface () {
  const playingFieldElement = createElement('playing-field')
  const startElement = createElement('start')
  const restartElement = createElement('restart')
  const scoreElement = createElement('score')
  const highscoreElement = createElement('highscore')
  const yourScoreElement = createElement('your-score')
  const congratulationsElement = createElement('congratulations')
  const gameoverElement = createElement('gameover')

  return {
    showPlayingField: () => playingFieldElement.show(),
    hidePlayingField: () => playingFieldElement.hide(),
    showStart: () => startElement.show(),
    hideStart: () => startElement.hide(),
    showCongratulations: () => congratulationsElement.show(),
    hideCongratulations: () => congratulationsElement.hide(),
    showGameover: () => gameoverElement.show(),
    hideGameover: () => gameoverElement.hide(),
    setScore: value => scoreElement.setValue(value),
    setHighscore: value => highscoreElement.setValue(value),
    setYourScore: value => yourScoreElement.setValue(value),
    onStartClick: handler => startElement.on('click', handler),
    onRestartClick: handler => restartElement.on('click', handler)
  }
}

function createCanvas ({ state }) {
  const canvasDebug = debug.extend('canvas')
  const canvasElement = createElement('playing-field')
  const canvas = canvasElement.getElement()
  const ctx = canvas.getContext('2d')
  const arenaWidth = areaSquareWidth * squareWidth
  let frameRequestId

  canvas.width = arenaWidth
  canvas.height = arenaWidth

  function drawRectangle (x, y, color) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, squareWidth, squareWidth)
  }

  function drawSnake (body) {
    body.forEach((part, index) => {
      drawRectangle(
        part.x * squareWidth,
        part.y * squareWidth,
        `rgba(255,255,255, 0.7)`
      )
    })
  }

  function drawApples (apples) {
    apples.forEach(apple => {
      drawRectangle(
        apple.x * squareWidth,
        apple.y * squareWidth,
        `rgba(255,0,0, 0.7)`
      )
    })
  }

  function clearCanvas () {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  function draw (timestampDiff) {
    // ⚠️ Be careful. Your browser might hang out
    // Uncomment only to see how render loop works
    // canvasDebug(timestampDiff)
    clearCanvas()
    drawSnake(state.getSnake())
    drawApples(state.getApples())
    frameRequestId = window.requestAnimationFrame(draw)
  }

  function startRendering () {
    frameRequestId = window.requestAnimationFrame(draw)
  }

  function stopRendering () {
    cancelAnimationFrame(frameRequestId)
  }

  return {
    startRendering,
    stopRendering
  }
}

function createKeyboardController () {
  const controllerDebug = debug.extend('keyboard')
  const keyCodeToNameMap = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  }
  const handlers = {
    left: [],
    up: [],
    right: [],
    down: []
  }

  document.onkeydown = function (e) {
    const keyName = keyCodeToNameMap[e.keyCode]
    controllerDebug(`Pressed ${keyName}`)

    if (keyName) {
      handlers[keyName].forEach(handler => handler(e))
    }
  }

  return {
    onClick: (key, handler) => {
      handlers[key].push(handler)
    }
  }
}

function createAkaiMpd18Controller () {
  const controllerDebug = debug.extend('AKAI-MPD18')

  const buttonIdToNameMap = {
    13756: 'left',
    13761: 'up',
    13758: 'right',
    13753: 'down'
  }
  const handlers = {
    left: [],
    up: [],
    right: [],
    down: []
  }

  WebMidi.enable()
    .then(onEnabled)
    .catch(err => controllerDebug(err))

  function onEnabled () {
    const controller = WebMidi.getInputByName('Akai MPD18')

    controller.addListener('midimessage', event => {
      const buttonId = String(event.data[0]) + String(event.data[1])
      const keyName = buttonIdToNameMap[buttonId]

      if (keyName) {
        controllerDebug(`Pressed ${keyName}`)
        handlers[keyName].forEach(handler => handler())
      }
    })
  }

  return {
    onClick: (key, handler) => {
      handlers[key].push(handler)
    }
  }
}

function createElement (name) {
  const element = document.querySelector(`#js-${name}`)

  function on (eventName, handler) {
    element.addEventListener(eventName, handler)
  }

  function show () {
    element.hidden = false
  }

  function hide () {
    element.hidden = true
  }

  function setValue (value) {
    element.innerText = value
  }

  function getElement () {
    return element
  }

  return {
    on,
    show,
    hide,
    setValue,
    getElement
  }
}

function getRandomInt (start, end) {
  const random = Math.round(Math.random() * end + start)
  return random
}

function showIntroInConsole () {
  console.log(
    `%c
    
 .d8888b.                    888                     .d8888b.                                  
 d88P  Y88b                   888                    d88P  Y88b                                 
 Y88b.                        888                    888    888                                 
  "Y888b.   88888b.   8888b.  888  888  .d88b.       888         8888b.  88888b.d88b.   .d88b.  
     "Y88b. 888 "88b     "88b 888 .88P d8P  Y8b      888  88888     "88b 888 "888 "88b d8P  Y8b 
       "888 888  888 .d888888 888888K  88888888      888    888 .d888888 888  888  888 88888888 
 Y88b  d88P 888  888 888  888 888 "88b Y8b.          Y88b  d88P 888  888 888  888  888 Y8b.     
  "Y8888P"  888  888 "Y888888 888  888  "Y8888        "Y8888P88 "Y888888 888  888  888  "Y8888  

                                            _           
                                            | |          
                                            | |__  _   _ 
                                            | '_ \| | | |
                                            | |_) | |_| |
                                            |_.__/ \__, |
                                                    __/ |
                                                    |___/ 
                                                    
    888888                   d8b                                          888      d8b 
    "88b                   Y8P                                          888      Y8P 
        888                                                                888          
        888  8888b.  88888b.  888  .d88b.   .d88b.  888  888  888 .d8888b  888  888 888 
        888     "88b 888 "88b 888 d88P"88b d88""88b 888  888  888 88K      888 .88P 888 
        888 .d888888 888  888 888 888  888 888  888 888  888  888 "Y8888b. 888888K  888 
        88P 888  888 888  888 888 Y88b 888 Y88..88P Y88b 888 d88P      X88 888 "88b 888 
        888 "Y888888 888  888 888  "Y88888  "Y88P"   "Y8888888P"   88888P' 888  888 888 
    .d88P                            888                                              
    .d88P"                        Y8b d88P                                              
888P"                           "Y88P"                                               
                                                
  
 `,
    'color:lime;text-shadow: 5px 5px 5px #000'
  )
}
