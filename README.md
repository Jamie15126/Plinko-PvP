# 2 Player Plinko

## Play here: https://jamie15126.github.io/Plinko-PvP/

Casino game built for a statistics class. Meant to be played with 2 people.


### Instructions: 
- Each player has a pool of currency.
- Each round a ball is dropped and a certain amount is withdrawn.
- There are 3 types of slots your ball can land in:
  - **Pot slot:** You win the money in the Pot. These are the 2 outside slots.
  - **Center slot:** 5% goes to the house/casino (can't be returned), 45% goes into the pot, 50% is returned to the player who owned the ball.
  - **Team Slots:** On either side of the center slot are player slots colored either blue or red. Based on which one you land in decides where money goes.
- Each round each player can boost in 1 of the 4 cardinal directions one time while between the two dashed yellow "Boost Line"s.

When you land in the **Team Slots** you either are on your own side or on the opponents side. You want to land in their slots and when you do you get part of their bet. When you land on your side they get a percentage of your bet. The Max amount that can be traded in game is 100% or 50% per ball in a slot. The rates change based off distance from the center slot.

### Controls:
- Team **Red** uses "wasd" to boost in the directions of up, down, left and right.
- Team **Blue** uses Arrow Keys to do the same.
- Space bar to drop both balls and start round.

### House Options:
The house can manually set the balance of each players pool of currency. 
You can also set the bet amount per ball.

### Exporting Data
In the house controls tab there is an Export Data button. It generates a CSV file with the format of [Round Number] [Team] [Slot] [Bet]

### Features Coming Soon:
- UI Element to change number of boosts usable per round.
- Color themes? Likely would be stored in a .yml file and referenced by the HTML.
- Better Horizontal Screen Usage. No plans for a mobile version.
- Would be interesting to use something like this: https://github.com/plinko-team/plinko
- **Online Multiplayer:**
  - MySQL database polling for data synchronization.
  - Host players computer runs similution and game computations.
  - Database not provided.
  - Perhaps a portforwarding or non-database version in the future.

### Warnings: 
- Sounds might not work depending on browser settings.
- Rampant } else if ( statements currently cus optimization is for people with slow computers (I'm not good at javascript)
- Includes *some* AI generated code.

### Credits:
- The concept and design 100% by me. Anyone is free to use this however they wish under the condition that credit of the original Player vs Player style of plinko is award to Jamie.
- Color Scheme inpired by https://github.com/AnsonH/plinko-game
