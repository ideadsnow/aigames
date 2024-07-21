import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const GRID_SIZE = 20;
const INITIAL_FOOD_COUNT = 3;
const GAME_SPEED = 150;
const MAX_FOOD_COUNT = 10;

type Position = { x: number; y: number };
type Direction = { x: number; y: number };

const getRandomPosition = (occupiedPositions: Position[]): Position => {
  let position: Position;
  do {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (occupiedPositions.some(pos => pos.x === position.x && pos.y === position.y));
  return position;
};

const getRandomDirection = (): Direction => {
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  return directions[Math.floor(Math.random() * directions.length)];
};

const getOppositeDirection = (direction: Direction): Direction => ({
  x: -direction.x,
  y: -direction.y,
});

const SnakeSegment: React.FC<{ position: Position; isHead: boolean; cellSize: number }> = ({ position, isHead, cellSize }) => (
  <div
    className={`absolute rounded-sm ${isHead ? 'bg-green-500' : 'bg-indigo-600'}`}
    style={{
      left: `${(position.x * cellSize) / GRID_SIZE * 100}%`,
      top: `${(position.y * cellSize) / GRID_SIZE * 100}%`,
      width: `${cellSize / GRID_SIZE * 100}%`,
      height: `${cellSize / GRID_SIZE * 100}%`,
    }}
  />
);

const Food: React.FC<{ position: Position; cellSize: number }> = ({ position, cellSize }) => (
  <div
    className="absolute bg-red-500 rounded-full"
    style={{
      left: `${(position.x * cellSize) / GRID_SIZE * 100}%`,
      top: `${(position.y * cellSize) / GRID_SIZE * 100}%`,
      width: `${cellSize / GRID_SIZE * 100}%`,
      height: `${cellSize / GRID_SIZE * 100}%`,
    }}
  />
);

const ControlButtons: React.FC<{ onDirectionChange: (direction: Direction) => void }> = ({ onDirectionChange }) => (
  <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3 md:hidden">
    <div className="col-span-3 flex justify-center">
      <Button onClick={() => onDirectionChange({ x: 0, y: -1 })} className="bg-indigo-200 hover:bg-indigo-300 text-indigo-800">
        <ArrowUp />
      </Button>
    </div>
    <Button onClick={() => onDirectionChange({ x: -1, y: 0 })} className="bg-indigo-200 hover:bg-indigo-300 text-indigo-800">
      <ArrowLeft />
    </Button>
    <Button onClick={() => onDirectionChange({ x: 0, y: 1 })} className="bg-indigo-200 hover:bg-indigo-300 text-indigo-800">
      <ArrowDown />
    </Button>
    <Button onClick={() => onDirectionChange({ x: 1, y: 0 })} className="bg-indigo-200 hover:bg-indigo-300 text-indigo-800">
      <ArrowRight />
    </Button>
  </div>
);

const InstructionsDialog: React.FC = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button className="mt-4 sm:mt-6 bg-blue-500 hover:bg-blue-600 text-white">
        <HelpCircle className="mr-2" />
        操作说明
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-md bg-white">
      <DialogHeader>
        <DialogTitle>操作说明</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">键盘控制（PC端）：</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>↑ 向上移动</li>
            <li>↓ 向下移动</li>
            <li>← 向左移动</li>
            <li>→ 向右移动</li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">触屏控制（移动端）：</h3>
          <p>使用屏幕底部的方向按钮控制蛇的移动。</p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">游戏规则：</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>控制蛇吃掉红色食物</li>
            <li>每吃掉一个食物，蛇身长度加一，得分加一</li>
            <li>场上同时存在多个食物</li>
            <li>撞到墙壁或自己身体时游戏结束</li>
          </ul>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [foods, setFoods] = useState<Position[]>([]);
  const [direction, setDirection] = useState<Direction>(getRandomDirection());
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [cellSize, setCellSize] = useState(20);
  const [hasMoved, setHasMoved] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const initializeFoods = useCallback(() => {
    const newFoods = [];
    for (let i = 0; i < INITIAL_FOOD_COUNT; i++) {
      newFoods.push(getRandomPosition(snake));
    }
    setFoods(newFoods);
  }, [snake]);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const newHead = {
        x: prevSnake[0].x + direction.x,
        y: prevSnake[0].y + direction.y
      };

      // Check for collision with walls
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return prevSnake;
      }

      // Check for collision with self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake.slice(0, -1)];

      const foodIndex = foods.findIndex(food => food.x === newHead.x && food.y === newHead.y);
      if (foodIndex !== -1) {
        setScore(prevScore => prevScore + 1);
        setFoods(prevFoods => {
          const newFoods = [...prevFoods];
          newFoods.splice(foodIndex, 1);
          if (newFoods.length < MAX_FOOD_COUNT) {
            const additionalFoods = Array.from({ length: Math.floor(Math.random() * 2) + 1 }, () => getRandomPosition([...newFoods, ...newSnake]));
            return newFoods.concat(additionalFoods);
          }
          return newFoods;
        });
        setHasMoved(false);
        return [newHead, ...prevSnake];
      }

      setHasMoved(false);
      return newSnake;
    });
  }, [direction, foods]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const minDimension = Math.min(containerWidth, containerHeight);
        const newCellSize = Math.floor(minDimension / GRID_SIZE);
        setCellSize(newCellSize);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver && countdown === 0) {
      gameLoopRef.current = window.setInterval(moveSnake, GAME_SPEED);
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, countdown, moveSnake]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameOver || countdown > 0 || hasMoved) return;

    const newDirection = (() => {
      switch (e.key) {
        case 'ArrowUp':
          return { x: 0, y: -1 };
        case 'ArrowDown':
          return { x: 0, y: 1 };
        case 'ArrowLeft':
          return { x: -1, y: 0 };
        case 'ArrowRight':
          return { x: 1, y: 0 };
        default:
          return direction;
      }
    })();

    if (newDirection.x !== getOppositeDirection(direction).x || newDirection.y !== getOppositeDirection(direction).y) {
      setDirection(newDirection);
      setHasMoved(true);
    }
  }, [gameOver, countdown, direction, hasMoved]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const startGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection(getRandomDirection());
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
    setCountdown(3);
    setHasMoved(false);
    initializeFoods();

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount > 1) {
          return prevCount - 1;
        } else {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          return 0;
        }
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-indigo-700">贪吃蛇游戏</h1>
      <div className="mb-2 sm:mb-4 text-xl sm:text-2xl font-semibold text-indigo-800">得分: {score}</div>
      <div 
        ref={containerRef}
        className="w-full max-w-md aspect-square border-4 border-indigo-500 rounded-lg shadow-lg relative bg-indigo-50 overflow-hidden"
      >
        {snake.map((segment, index) => (
          <SnakeSegment key={index} position={segment} isHead={index === 0} cellSize={cellSize} />
        ))}
        {foods.map((food, index) => (
          <Food key={`food-${index}`} position={food} cellSize={cellSize} />
        ))}
        {(!gameStarted || gameOver) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <Button onClick={startGame} className="text-lg px-6 py-3 bg-green-500 hover:bg-green-600 text-white">
              {gameOver ? "重新开始" : "开始游戏"}
            </Button>
          </div>
        )}
        {gameStarted && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-6xl font-bold text-white">{countdown}</div>
          </div>
        )}
      </div>
      <ControlButtons onDirectionChange={setDirection} />
      <InstructionsDialog />
      <div className="mt-4 text-xs text-gray-600">
        This game was meticulously crafted by Snow using the advanced capabilities of the GPT-4o model.
      </div>
    </div>
  );
};

export default SnakeGame;