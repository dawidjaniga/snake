import cloneDeep from 'lodash/cloneDeep'
import createDebug from 'debug'
const debug = createDebug('snake')
localStorage.debug = '*'

const squareWidth = 14
const areaSquareWidth = Math.floor(window.innerHeight / 20)

function createState () {
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
    apples: []
  }
  let state = cloneDeep(defaultState)

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
      ))
  }
}

function createSnakeGame () {
  showIntroInConsole()
  debug('Creating Snake Game')

  const state = createState()

  const area = createArea({ state })
  const areaElement = createElement('area')
  const startElement = createElement('start')
  const restartElement = createElement('restart')
  const scoreElement = createElement('score')
  const yourScoreElement = createElement('your-score')
  const highscoreElement = createElement('highscore')
  const newHighscoreElement = createElement('new-highscore')
  const gameoverElement = createElement('gameover')
  const keyboard = createKeyboardController()
  const snake = createSnake({ startDirection: 'right' })
  let gameInterval
  let randomAppleTimeout
  ;['left', 'right', 'up', 'down'].forEach(direction =>
    keyboard.onClick(direction, () => snake.changeDirection(direction))
  )

  startElement.on('click', () => {
    startElement.hide()
    areaElement.show()
    setTimeout(startGame, 500)
    randomAppleTimeout = startAddRandomAppleTimeout()
  })

  restartElement.on('click', () => {
    prepareGame()
    areaElement.show()
    setTimeout(startGame, 500)
  })

  function startAddRandomAppleTimeout () {
    setTimeout(() => {
      addRandomApple()
      randomAppleTimeout = startAddRandomAppleTimeout()
    }, getRandomInt(16000, 40000))
  }

  prepareGame()

  function prepareGame () {
    state.resetState()
    scoreElement.setValue(state.getScore())
    highscoreElement.setValue(state.getHighscore())
    gameoverElement.hide()
    newHighscoreElement.hide()
    areaElement.hide()
  }

  function startGame () {
    debug('Starting game')
    addRandomApple()
    startGameInterval()
    area.startRendering()
  }

  function endGame () {
    stopGame()
    setGameResults()
    gameoverElement.show()
    snake.resetDirection()
    clearTimeout(startAddRandomAppleTimeout)
  }

  function setGameResults () {
    const highscore = state.getHighscore()
    const score = state.getScore()
    yourScoreElement.setValue(score)

    if (score > highscore) {
      localStorage.setItem('highscore', score)
      newHighscoreElement.show()
    }
  }

  function eatApple (eatenApple) {
    state.addSnakePart()
    state.removeApple(eatenApple)
    addPoint()
    scoreElement.setValue(state.getScore())
    stopGameInterval()
    startGameInterval()
  }

  function addPoint () {
    state.addScorePoint()
    debug('➕ Point added. New score: ', state.getScore())
    scoreElement.innerText = state.getScore()
  }

  function addRandomApple () {
    state.addApple({
      x: getRandomInt(0, areaSquareWidth - 1),
      y: getRandomInt(0, areaSquareWidth - 1)
    })
  }

  function clock () {
    state.setSnake(snake.getNewPosition(state.getSnake()))
    const appleOnSnakeHead = headIsOnApple()

    if (headTouchingBoundaries() || snakeEatHimself()) {
      endGame()
    }

    if (appleOnSnakeHead) {
      eatApple(appleOnSnakeHead)
      addRandomApple()
    }
  }

  function headIsOnApple () {
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

  function headTouchingBoundaries () {
    const head = state.getSnakeHead()

    return (
      head.x < 0 ||
      head.x >= areaSquareWidth ||
      head.y < 0 ||
      head.y >= areaSquareWidth
    )
  }

  function snakeEatHimself () {
    const head = state.getSnakeHead()
    let result = false

    state
      .getSnake()
      .slice(1)
      .some(part => (result = part.x === head.x && part.y === head.y))
    return result
  }

  function startGameInterval () {
    gameInterval = setInterval(
      clock,
      calculateSpeedBasedOnScore(state.getScore())
    )
  }

  function stopGameInterval () {
    clearInterval(gameInterval)
  }

  function stopGame () {
    debug('🏁 Game over. Your result', state.getScore())
    stopGameInterval()
    area.stopRendering()
  }

  function calculateSpeedBasedOnScore (score) {
    const minSpeed = 250
    const maxSpeed = 80
    const step = 25
    const speed = minSpeed - score * 25
    const newSpeed = speed < maxSpeed ? maxSpeed : speed
    console.groupEnd('Snake with speed ', speed)
    console.group('Snake with speed ', newSpeed)
    return newSpeed
  }

  return {}
}

function createArea ({ state }) {
  debug('Creating Area')
  const canvasElement = createElement('area')
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

  function draw (timestamp) {
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
    drawSnake,
    startRendering,
    stopRendering
  }
}

const game = createSnakeGame()

function getRandomInt (start, end) {
  const random = Math.round(Math.random() * end + start)
  return random
}

function createSnake ({ startDirection }) {
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

function createKeyboardController () {
  const keyCodesToNamesMap = {
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

  function getKeyNameByCode (code) {
    return mapKeys[code]
  }

  document.onkeydown = function (e) {
    const keyName = keyCodesToNamesMap[e.keyCode]

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
