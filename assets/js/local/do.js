(function() { // store vars in a privately scoped anonymous function

    /* load global objects */

    var debugMode = true, // prod = false, dev = true
    	debugLog = function (msg) { // throw messages to console.log only when in dev mode
	    	if (debugMode) console.log(msg);
	    },
	    currentUser = null, // dev - this should store something unique, such as username or user ID
	    gameReferee = null,
    	currentRound = 0, // start the game at round 0, aka high card deal
    	playerCount = 0, // how many players are in this game?
    	$body = null, // stubs for future jQuery object caching
    	$createGameForm = null,
    	$roundsSelector = null,
    	$scoreboardContainer = null,
    	$cardTableContainer = null,
    	$showHideScoreboardLink = null,
    	dealDelayQueue = [],
    	dealDelayInterval = 200, // time in miliseconds to wait between each card deal
    	dealDelayTimer = null,
    	game = {
    		started: false,
        	rounds: [],
        	playerList: [],
        	playerCount: function () {
				return 'players-' + this.playerList.length;
			},
        	scoreboardPlayerThreshold: function () {
				if (this.playerList.length <= 6) {
					return 'span4 offset8';
				} else {
					return 'span5 offset7';
				}
			}
        },
        printScoreboard = function () { // print scoreboard

    		$scoreboardContainer.html(ich.scoreboard(game));

		},
    	printCardTable = function () { // print card table

			$cardTableContainer.html(ich.cardTable(game));

		},
		printScoreboardCardTable = function () { // print both at once

			printScoreboard(); // display scoreboard

	    	printCardTable(); // display card table

		},
        ferrisWheel = function (loopedArr, increment) { // rotate the passed array as if in a loop, HIGHER to LOWER / BACK to FRONT, incrementing by the passed number

        	debugLog('ferris wheel called');

        	var tempIncrement = parseInt(increment);

        	if (tempIncrement < 0) tempIncrement = loopedArr.length - tempIncrement; // if passed a negative number, move "backward"

        	_.times(tempIncrement, function () {

        		loopedArr.push(loopedArr.shift());

        	});

        },
        rotateTable = function () { // rotate the each of "game.rounds[].players" arrays so that the client player is at index 0, and will therefore be "seated" at the bottom of the table

			debugLog('rotate table called');

			var tempFind = _.find(game.playerList, function (val) { return val.currentUser; });

	    	var tempPlayerOffset = _.indexOf(game.playerList, tempFind);

	    	_.each(game.rounds, function (value, index) {

	    		ferrisWheel(value.players, tempPlayerOffset);

	    	});

		},
		sortCardsByNumber = function (cardsToSort, sortOrder) {

			var tempArr = _.sortBy(cardsToSort, function (value) {

				switch(value.card) {
					case 'two':
						return 1;
					break;
					case 'three':
						return 2;
					break;
					case 'four':
						return 3;
					break;
					case 'five':
						return 4;
					break;
					case 'six':
						return 5;
					break;
					case 'seven':
						return 6;
					break;
					case 'eight':
						return 7;
					break;
					case 'nine':
						return 8;
					break;
					case 'ten':
						return 9;
					break;
					case 'jack':
						return 10;
					break;
					case 'queen':
						return 11;
					break;
					case 'king':
						return 12;
					break;
					case 'ace':
						return 13;
					break;
				}

			});

			if (sortOrder == 'descending') {
				return tempArr.reverse();
			} else {
				return tempArr;
			}

		},
		sortCardsBySuit = function (cardsToSort) {

			return _.sortBy(cardsToSort, function (value) {

				switch(value.suit) {
					case 'spades':
						return 1;
					break;
					case 'diamonds':
						return 2;
					break;
					case 'clubs':
						return 3;
					break;
					case 'hearts':
						return 4;
					break;
				}

			});

		},
		sortClientPlayersCards = function () { // iterate through the current client player's cards for each round where there are 2 or more cards, and sort them so they look nice

			_.each(game.rounds, function (value, index) {

				if (value.cards > 1) {

					_.each(value.players, function (value, index) {

						if (value.currentUser == true) {

							value.cards = sortCardsBySuit(sortCardsByNumber(value.cards));

						}

					});

				}

			});

		},
        dealDelay = function (delayedFunction) {

			dealDelayQueue.push(delayedFunction);

			function executeDelayedFunction () {

				if ( dealDelayQueue.length === 0 ) {

					clearInterval(dealDelayTimer);

					dealDelayTimer = null;

				} else {

					dealDelayQueue.shift()();

				}

			}

			if (!dealDelayTimer) dealDelayTimer = setInterval(executeDelayedFunction, dealDelayInterval);

	    },
		initializeEventListeners = function () {

			$scoreboardContainer.on('click', $showHideScoreboardLink, function (e) {

				e.preventDefault();

				$(this).toggleClass('show-hide-scoreboard');

			});

		},
		dealSomeCards = function () {

			debugLog('deal some cards called');

			_.times(game.rounds[currentRound].cards, function (n) { // iterate through the number of cards needed for the current hand

				_.each(game.rounds[currentRound].players, function (value, index) { // iterate through each player

					var currentCardSelector = '.player:eq(' + index + ') .card:eq(' + n + ')';

		    		dealDelay(function () {

		    			$cardTableContainer.find(currentCardSelector).addClass('dealt');

		    		});

		    	});

			});

			dealDelay(function () { /* dummy beat */ });

			dealDelay(function () { $cardTableContainer.find('.card-table').addClass('deal-complete'); });

		},
        freshShuffledDeck = function () {

        	var deckComponents = {
		    		suits: [
		    			'hearts',
			    		'clubs',
			    		'diamonds',
			    		'spades'
		    		],
		    		cards: [
		    			'two',
		    			'three',
		    			'four',
		    			'five',
		    			'six',
		    			'seven',
		    			'eight',
		    			'nine',
		    			'ten',
		    			'jack',
		    			'queen',
		    			'king',
		    			'ace'
		    		]
		        },
		        deck = [];

        	_.each(deckComponents.suits, function(value, index) {
				var suit = value;
				_.each(deckComponents.cards, function(value, index) {
					deck.push({ suit: suit, card: value });
		    	});
			});

			return _.shuffle(deck);

        },
        updateCurrentRound = function (callback) { // run at the beginning of each round, starting with the first round fo play

        	if (currentRound + 1 === game.rounds.length) { // game over

        		game.ended = true;

        		debugLog('Game Over!');

        	} else {

        		currentRound++;

        		_.each(game.rounds, function (value, index) {

					if (currentRound === index) {
						value['started'] = true;
						value['currentRound'] = true;
					} else {
						value['currentRound'] = false;
					}

				});

				$body.removeClass('cards-' + game.rounds[currentRound - 1].cards).addClass('cards-' + game.rounds[currentRound].cards);

				printScoreboardCardTable(); // print table

				return callback();

        	}

		};

    /* /load global objects */

    /* establish connection to Firebase */

    // get a reference to the root of the backend data
	//var backend = new Firebase('https://ohhell.firebaseIO.com/');

    /* /establish connection to Firebase */

    //*********************************************************************************************
    //
    // "Server" Code - code to be run by 1 player per game, as if by a central server
    //
    //*********************************************************************************************

    var createGame = function () { // if you're the first person, create a new game

	    debugLog('create game called');

    	$roundsSelector.change(function() {

    		$(this).next('.label').text('');

    		var roundsVal = parseInt( $(this).val() );

    		if ( roundsVal === 8) {
    			$(this).next('.label').text('maximum 6 players');
    		} else if ( roundsVal === 7) {
    			$(this).next('.label').text('maximum 7 players');
    		} else {
    			$(this).next('.label').text('maximum 8 players');
    		}

    	});

    	$createGameForm.submit(function(e) {
    		e.preventDefault();

    		gameReferee = true; // indicate that you're the game referee, and you'll be doing running the "server" functions from here on out

    		var rounds = parseInt( $roundsSelector.val() ),
    			player = $(this).find('#player').val();

    		game.playerList.push({ name: player, userid: player.replace(/\s/g, '').toLowerCase(), score: 0 });

    		_.times(( rounds * 2 ) - 1, function(n) {

    			var tempRoundModel = {
						cardsPlayed: [],
						cards: null,
						players: null
					};

				if (n == 0) tempRoundModel.started = true; // if building the 1st round add the "started" flag for the scoreboard

    			if ($createGameForm.find('input[name=order]:checked').val() === 'low') { // for low/high/low games, increment the rounds starting at 1, going up to [# of rounds], then back down to 1

    				if (n < rounds) {
    					tempRoundModel.cards = n + 1;
    				} else {
    					tempRoundModel.cards = rounds + ( rounds - ( n + 1 ) );
    				}

    			} else { // for high/low/high games, increment the rounds starting at [# of rounds], going down to 1, then back up to [# of rounds]

    				if (n < rounds) {
    					tempRoundModel.cards = rounds - n;
    				} else {
    					tempRoundModel.cards = ( n + 2 ) - rounds;
    				}

    			}

    			tempRoundModel.cardsPlayed.length = tempRoundModel.cards; // set the length of the currently empty "cardsPlayed" array to the number of cards in the round

    			game.rounds.push(tempRoundModel);

    		});

	    	game.rounds.unshift({ highCardDeals: true, cards: 1, cardsPlayed: [], players: null }); // add initial high card round in the first spot in the "rounds" array

			addPlayers();

    	});

    },
    addPlayers = function () { // join all players to the game

    	debugLog('add players called');


    	// dev code

    	// add dummy players
		var dummyPlayers = ['Player 2', 'Player 1', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8'];

		_.times(7, function (n) {
			if (n <= 1) {
				game.playerList.unshift({ name: dummyPlayers[n], userid: dummyPlayers[n].replace(/\s/g, '').toLowerCase(), score: 0 });
			} else {
				game.playerList.push({ name: dummyPlayers[n], userid: dummyPlayers[n].replace(/\s/g, '').toLowerCase(), score: 0 });
			}
		});

		// /end dev code


		playerCount = game.playerList.length; // set the player count to the number of players in this game

		dealTheRounds();

    },
    dealTheRounds = function () { // once all players have joined, deal the cards for all rounds

    	debugLog('deal the rounds called');

    	_.each(game.rounds, function (value, index, list) { // deal out each round, to each player, then select trump

			var thisRound = value, // make some cache vars
				deck = freshShuffledDeck(); // grab a shuffled deck for each round's deal

			value.players = _.map(game.playerList, function (item) { // populate each round with a players arr; a list of players with blank "cards"

				return { name: item.name, userid: item.userid, cards: [], bid: ' ', take: 0 };

			});

			_.each(value.players, function (value, index, list) { // pass out the number of cards for each round to each player

				value.cards = deck.splice(0, thisRound.cards);

			});

			if (!thisRound.highCardDeals || thisRound.highCardDeals === undefined) thisRound['trump'] = deck.shift();

		});

    	setupGame();

    },
    scoreHighCardDeal = function () {

    	debugLog('score high card deal called');

    	var highCardRound = game.rounds[0], // cache this out for brevity, as we'll be using it a lot in this function
    		tieBreaker = function () { // it's a tie, deal more cards to the winners and rerun the high card deal round

    			debugLog('TIE BREAKER ROUND');

				var deck = freshShuffledDeck(), // grab a new shuffled deck for the extra round
					tempWinners = _.pluck(_.filter(highCardRound.cardsPlayed, function (value) { return value.card == highCardRound.cardsPlayed[0].card; }), 'userid'),
					tempTimer = setTimeout(function () {

						showHighCardDeal(); // after dealing fresh cards to the tying players, send it back to the client's "show high card deal" function

						clearTimeout(tempTimer);

					}, 1000); // create a list of all players who tied

				_.each(highCardRound.players, function (value, index) { // pass out the number of cards for each round to each player

					value.cards = [];

					if (_.contains(tempWinners, value.userid)) { // if the current user is one of the tying winners do stuff

						$('#player-' + value.userid).find('.card').addClass('winner'); // highlight their current card as a winner

						value.cards = deck.splice(0, 1); // then give them a new card

					}

				});

    		};

    	highCardRound.cardsPlayed = _.map(_.filter(highCardRound.players, function (value) { return value.cards.length !== 0; }), function (item) { // populate "cardsPlayed" arr with the cards dealt to each player and the userid for that player, but only if the player has a card (relevant in the tie breaker round)

			return { userid: item.userid, card: item.cards[0].card }; // copy the player's cards to the "cardsPlayed" arr

		});

    	// sort the played cards
		highCardRound.cardsPlayed = sortCardsByNumber(highCardRound.cardsPlayed, 'descending');

		// check to make sure no one ties for high card
		if (highCardRound.cardsPlayed[0].card == highCardRound.cardsPlayed[1].card) {

			tempTimer = setTimeout(tieBreaker, (playerCount * dealDelayInterval) + 1500); // wait for the round to be dealt to all players + 1.5 second before running the tie breaker round

		} else { // annoint the winner with oils

			var tempWinner = highCardRound.cardsPlayed[0].userid;

			tempTimer = setTimeout(function () { // wait for the cards to be dealt to each player + 1.5 second before showing the winner

				$('#player-' + tempWinner).find('.card').addClass('winner'); // highlight the winner's current card

				tempTimer = setTimeout(function () { // wait for 1.5 seconds before moving on

					showRound(); // after noting the winner, send it back to the client's "show round" function

				}, 1500);

			}, (playerCount * dealDelayInterval) + 1500);

			game.started = true; // since we will now be successfully exiting the pre-game, indicate that the game has started

		}

		debugLog(game);

    },
    scoreRound = function () {

    	debugLog('score round ' + currentRound + ' called');

    };

    //*********************************************************************************************
    //
    // "Client" Code - code to be run by each player
    //
    //*********************************************************************************************

    var setupGame = function() { // once all server functions have run, setup the game relative to each client player

    	debugLog('setup game called');


    	// dev code

    	// set current user
		// MUST find a better way to do this for prod

		// set currentUser for the current client user in the players arr and each round
		game.playerList[2]['currentUser'] = true;

		_.each(game.rounds, function (value, index) {
			value.players[2]['currentUser'] = true;
		});

		// in prod code this should be set by a check using Firebase Auth
		currentUser = game.playerList[2].userid;

		// /end dev code

		sortClientPlayersCards(); // iterate through the current client player's cards for each round where there are 2 or more cards, and sort them so they look nice

    	rotateTable(); // rotate the each of "game.rounds[].players" arrays so that the client player is at index 0, and will therefore be "seated" at the bottom of the table

    	initializeEventListeners();

    	debugLog(' /end start game');

    	showHighCardDeal(); // load high card deal show function to show first dealer

    },
    showHighCardDeal = function () { // show high card deal card to choose first dealer

    	debugLog('show high card deal called');

    	$body.addClass('start-game cards-1'); // identifiy that the game has begun and the number of cards in the current round

    	printCardTable(); // display scoreboard and card table

		var t = setTimeout(dealSomeCards, 1000); // deal some cards after a short delay

		if (gameReferee) scoreHighCardDeal();

		//debugLog(game);

    },
    showRound = function () { // deal each round

    	debugLog('show round ' + (currentRound + 1) + ' called');

		updateCurrentRound(function () { // update current round, then execute the callback to do other stuff

			var t = setTimeout(dealSomeCards, 1000); // deal some cards after a short delay

			playRound();

	    	//debugLog(game);

		});

    },
    playRound = function () { // deal each round

    	debugLog('play round ' + currentRound + ' called');

		if (gameReferee) scoreRound();

    	debugLog(game);

    };

    /* /show each round */

    /* when DOM is ready, bind some shit */

    $(document).ready(function() {

    	// cache DOM elements
    	$body = $('body'),
    	$createGameForm = $('#createGameForm'),
    	$roundsSelector = $('#roundsSelector'),
    	$scoreboardContainer = $('#scoreboardContainer'),
    	$cardTableContainer = $('#cardTableContainer'),
    	$showHideScoreboardLink = $('#showHideScoreboardLink');

    	createGame(); // load create game function, and lets get going!!

    	// dev
    	$('#previousRoundLink').click(function () {
    		dealDelayQueue = [];
    		currentRound = currentRound - 2;
    		showRound();
    	});

    	$('#advanceRoundLink').click(function () {
    		dealDelayQueue = [];
    		showRound();
    	});

    });

    /* /when DOM is ready, bind some shit */

})();