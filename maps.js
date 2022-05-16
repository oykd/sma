var maps = new Object();

maps.debug = `
Space marine adventures
Debug Map

[options]
debug = yes
planet = jupiter
background = space.jpg
cellWidth = 32
cellHeight = 32
heroView = 250

[pregame]
lobby:{
00 start
}

[physics]
gravity = 10
jumpPower = -6
jumpDuration = 12
jumpStart = -3
crawling = 3
run = 6
climbing = 3
slipping = 2


[map]
structure:{
|____________________________________________________________|
|                                                            |
|                                                            |
|                                                            |
|                                                            |
|   XXX                                                      |
|          W       =                                        R|
|X                 #                                       ==|
|                  #                                       ##|
| =                #                                    F  ##|
|H                 #                                       ##|
|==>   <>          #         J                       F     ##|
|###> <##>       J #        <=      J          FFFF        ##|
|####=####^^^^^^^=^#^^^===^^##^^^^^^=^^^^^^=^^^^^^^^^^^^^^^##|
}

[triggers]
# [timing] 
# [?/! landed/inSquare/vertical/onScreen] {}
# [sprite/pass/jump/teleport/message/clear : en/fo/ce : params]

gears = JFW

J:{
?landed:en:#
00 sprite:en:#:2
00 pass:en:#:4
10 ?landed:en:# jump:-20:-16:14
10 sprite:en:#:1
10 pass:en:#:1
R 20
}

F:{
?landed:en:#
00 sprite:en:#:0
00 pass:en:#:0
00 dynamic:create:en:#:32:32:0:6
05 dynamic:move:$:0:10
20 dynamic:destroy:$
}

W:{
?inSquare:en:#
00 teleport:50:3
R 10
}

machinery:{
050 message:hello:350:330:0:Greetings, cosmonaut!
150 clear:hello

100 message:tooltip:350:345:0:This is test map for SMA.
200 clear:tooltip

150 message:goodluck:350:360:0:Good luck in your little journey.
250 clear:goodluck

?landed:ce:0:7
00 message:secret:10:200:0:You found secret block
50 clear:secret

00 dynamic:create:400:410:32:32:0:6

00 dynamic:move:0:-1:0
50 dynamic:move:0:1:0
R 100

00 dynamic:create:220:320:32:32:0:6
00 dynamic:create:252:320:32:32:0:6
00 dynamic:create:130:220:32:32:0:6
00 dynamic:create:162:220:32:32:0:6

00 dynamic:move:1:-1:0
200 dynamic:move:1:1:0
00 dynamic:move:2:-1:0
200 dynamic:move:2:1:0
R 400

00 dynamic:move:3:0:1
220 dynamic:move:3:0:-1
00 dynamic:move:4:0:1
220 dynamic:move:4:0:-1
R 440
}



## Map file for Space Marine Adventures (c) by onyokneesdog 2018
## https://github.com/onyokneesdog/sma
## http://defiler.ru/demo/sma
`;