(function() { // store vars in a privately scoped anonymous function

    /* load global objects */

    var debugMode = true, // prod = false, dev = true
    	debugLog = function (msg) {
	    	if (debugMode) console.log(msg);
	    },
	    currentUsername = null, // dev - this should store something unique, such as username or user ID
	    dealOrder = null, // stub for future Arr containing list of sorted keys representing the deal order, relative to the current client user
    	currentRound = 0,
    	$body = null,
    	$createGameForm = null,
    	$rounds = null,
    	$scoreboardContainer = null,
    	$cardTableContainer = null,
    	$showHideScoreboardLink = null,
    	dealDelayQueue = [],
    	dealDelayTimer = null,
    	game = {
    		started: false,
        	rounds: [],
        	players: [],
        	playerCount: function () {
				return 'players-' + this.players.length;
			},
        	scoreboardPlayerThreshold: function () {
				if (this.players.length <= 6) {
					return 'span4 offset8';
				} else {
					return 'span5 offset7';
				}
			}
        },
        ferrisWheel = function (loopedArr, increment) { // copy the indices of the passed array as the values of a new array, then rotate the items in the new array, FORWARD TO BACK, as if in a loop, and return the new adjusted array

        	debugLog('ferris wheel called');

        	var tempIncrement = parseInt(increment),
        		tempArr = _.keys(loopedArr);

        	_.each(tempArr, function (value, index) {
        		tempArr[index] = parseInt(value);
        	});

        	if (tempIncrement < 0) tempIncrement = tempArr.length - tempIncrement; // if passed a negative number, move "forward"

        	_.times(tempIncrement, function () {

        		tempArr.push(tempArr.shift());

        	});

        	return tempArr;

        },
        calibrateTable = function () { // assign deal order based on position relative to the current client player facilitating rotating client player to the bottom of the table

        	debugLog('calibrate table called');

        	var playerOffset = _.indexOf(game.players, _.find(game.players, function (val) { return val.username == currentUsername; }));

        	dealOrder = ferrisWheel(game.players, playerOffset);

        	debugLog(dealOrder);

        },
        dealDelay = function (delayedFunction) {

			dealDelayQueue.push(delayedFunction);

			function executeDelayedFunction () {

				if ( dealDelayQueue.length === 0 ) {

					clearTimeout(dealDelayTimer);

					dealDelayTimer = null;

				} else {

					dealDelayQueue.shift()();

				}

			}

			if (!dealDelayTimer) dealDelayTimer = setInterval(executeDelayedFunction, 250);

	    },
        updateCurrentRound = function () { // run at the beginning of each round, starting with the first round fo play

        	if ( currentRound === ( game.rounds.length / 2 ) ) { // game over

        		game.ended = true;

        	} else {

        		currentRound++;

        		_.each(game.rounds, function (value, index) {

					if (index === currentRound) {
						game.rounds[index]['currentRound'] = true;
					} else {
						game.rounds[index]['currentRound'] = false;
					}

				});

				$body.removeClass('round-high-card-deals round-' + (currentRound - 1) ).addClass('round-' + currentRound);

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
		initializeEventListeners = function () {

			$scoreboardContainer.on('click', $showHideScoreboardLink, function (e) {

				e.preventDefault();

				$(this).toggleClass('hide-scoreboard');

			});

		},
		dealSomeCards = function () {

			debugLog('deal some cards called');

			_.times(game.rounds[currentRound].cards, function (n) { // iterate through the number of cards needed for the current hand

				_.each(dealOrder, function (value, index) { // iterate through each player in the order in which they sit at the table

					var currentPlayer = game.rounds[currentRound].cardsDealt[value];

					debugLog(currentPlayer);

		    		dealDelay(function () {

		    			var currentCard = n;

		    			currentPlayer.cards[currentCard].displayed = true;

			    		printCardTable();

		    		});

		    	});

			});

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

        };

    /* /load global objects */

    /* establish connection to Firebase */

    // get a reference to the root of the backend data
	//var backend = new Firebase('https://ohhell.firebaseIO.com/');

    /* /establish connection to Firebase */

    /* create game */

    function createGame() { // if you're the first person, create a new game

	    debugLog('create game called');

    	$rounds.change(function() {

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

    		var rounds = parseInt( $rounds.val() ),
    			player = $(this).find('#player').val();

    		game.players.push({ name: player, username: player.replace(/\s/g, '').toLowerCase(), score: 0 });

    		_.times(( rounds * 2 ) - 1, function(n) {

    			var roundModel = {
						hands: [],
						cards: null,
						cardsDealt: null
					};

    			if ($createGameForm.find('input[name=order]:checked').val() === 'low') { // for low/high/low games, increment the rounds starting at 1, going up to [# of rounds], then back down to 1

    				if (n < rounds) {
    					roundModel.cards = n + 1;
    				} else {
    					roundModel.cards = rounds + ( rounds - ( n + 1 ) );
    				}

    			} else { // for high/low/high games, increment the rounds starting at [# of rounds], going down to 1, then back up to [# of rounds]

    				if (n < rounds) {
    					roundModel.cards = rounds - n;
    				} else {
    					roundModel.cards = ( n + 2 ) - rounds;
    				}

    			}

    			roundModel.hands.length = roundModel.cards; // set the length of the currently empty "hands" array to the number of cards in the round

    			game.rounds.push(roundModel);

    		});

	    	game.rounds.unshift({ cards: 1, cardsDealt: null, highCard: true, currentRound: true }); // add initial high card round in the first spot in the "rounds" array

			startGame();

    	});

    }

    /* /create game */

    /* start game */

    function startGame() { // when other players join, start a game

    	debugLog('start game called');

    	// dev code

    	// set current user
		// in prod code this should be set by a check using Firebase Auth
		currentUsername = game.players[0].username;

		// might need to find a better way to do this for prod
		game.players[0]['currentUser'] = true;


    	// add dummy players
		var dummyPlayers = ['Nancy', 'Steve', 'Cindy', 'George', 'Stan', 'Brenda', 'Greg'];

		_.times(5, function (n) {
			if (n <= 1) {
				game.players.unshift({ name: dummyPlayers[n], username: dummyPlayers[n].replace(/\s/g, '').toLowerCase(), score: 0 });
			} else {
				game.players.push({ name: dummyPlayers[n], username: dummyPlayers[n].replace(/\s/g, '').toLowerCase(), score: 0 });
			}
		});

		// /end dev code

		// once all players have been added to the game object…

		$body.addClass('player-count-' + game.players.length); // identifiy the number of players sitting at the table

		calibrateTable(); // save table rotation offset so that the client player is "seated" at the bottom of the table


		_.each(game.rounds, function (value, index, list) { // deal out each round, to each player, then select trump

			var thisRound = value, // make some cache vars
				deck = freshShuffledDeck(); // grab a shuffled deck for each round's deal

			value.cardsDealt = _.map(game.players, function (item) { // populate each round with [cards dealt], a list of players with the blank "cards"
				return { name: item.name, username: item.username, currentUser: item.currentUser, cards: [] };
			});

			_.each(value.cardsDealt, function (value, index, list) {

				value.cards = deck.splice(0, thisRound.cards);

			});

			if (!thisRound.highCard || thisRound.highCard === undefined) thisRound['trump'] = deck.shift();

		});

		initializeEventListeners();

    	$body.addClass('start-game round-high-card-deals');

    	printScoreboardCardTable(); // display scoreboard and card table

    	showHighCardDeal(); // load high card deal show function to show first dealer

    	debugLog(' /end start game');

    }

    /* /start game */

    /* show high card deals */

    function showHighCardDeal() { // deal 1 card to each player to choose first dealer

    	debugLog('show high card called');

    	debugLog(game);

		game.started = true; // since this is the first round, indicate that the game has started

		var t = setTimeout(dealSomeCards, 1000); // deal some cards after a short delay

    }

    /* /show high card deals */

    /* show each round */

    function showRound() { // deal each round

    	debugLog('show round called');

		updateCurrentRound(); // update current round

		printScoreboardCardTable();

		var t = setTimeout(dealSomeCards, 1000); // deal some cards after a short delay

    	debugLog(game);

    }

    /* /show each round */

    /* when DOM is ready, bind some shit */

    $(document).ready(function() {

    	// cache DOM elements
    	$body = $('body'),
    	$createGameForm = $('#createGameForm'),
    	$rounds = $('#rounds'),
    	$scoreboardContainer = $('#scoreboardContainer'),
    	$cardTableContainer = $('#cardTableContainer'),
    	$showHideScoreboardLink = $('#showHideScoreboardLink');

    	createGame(); // load create game function, and lets get going!!

    	// dev
    	$('#previousRoundLink').click(function () {
    		currentRound--;
    		showRound();
    	});

    	$('#advanceRoundLink').click(function () {
    		showRound();
    	});

    });

    /* /when DOM is ready, bind some shit */

})();