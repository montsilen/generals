const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mysql = require('mysql');
const crypto = require("crypto");
const { setTimeout } = require('timers/promises');

const waiting = 0, on = 1;

class gameroom{
    constructor(index, starttimeleft){
        this.timer = setInterval(() => {
            if (this.starttimeleft > 0){
                this.starttimeleft --;
                io.to(this.roomname).emit("re_prepare", this.num, this.starttimeleft);
            } else if (this.starttimeleft == 0) {
                if (this.num >= 2) {
                    this.startgame();
                    this.starttimeleft --;
                } else {
                    clearInterval(this.timer);
                    this.timer = undefined;
                    io.to(this.roomname).emit("noplayers");
                    for (var i = 0; i < gamerooms.length; i++){
                        if (gamerooms[i].index == this.index){
                            gamerooms.splice(i, 1);
                        }
                    }
                }
            } else {
                clearInterval(this.timer);
                io.to(this.roomname).emit("gameon");
                this.timer = setInterval(() => {
                    this.updategame();
                }, 500);
            }
        }, 1000);
        this.index = index;
        this.status = waiting;
        this.roomname = index.toString();
        this.num = 0;
        this.players = new Array();
        this.starttimeleft = starttimeleft;
        this.turns = 0;
        this.mapsize = undefined;
        this.steps = new Array();
        this.map = undefined;
        this.generalposes = undefined;
        this.towerposes = undefined;
        this.mapstatus = new Array();
        this.maxlandandarmyandcap = new Array();
        this.rank = 0;
    }

    inroom(username){
        for (var i = 0; i < this.num; i++){
            if (this.players[i][1] == username && this.players[i][5] == 2){
                return true;
            }
        }
        return false;
    }

    socketinroom(socket){
        for (var i = 0; i < this.num; i++){
            if (this.players[i][3].id == socket.id && this.players[i][5] == 2){
                return true;
            }
        }
        return false;
    }

    addplayer(socket, username, id){
        var flag = false;
        for (var i = 0; i < gamerooms.length; i++){
            if (gamerooms[i].inroom(username)){
                flag = true;
            }
        }
        if (flag){
            socket.emit("loggedtwice");
        } else {
            pool.getConnection((err, connection) => {
                var sql = `SELECT userindex, stars FROM user WHERE username='${username}' AND userid='${id}'`;
                connection.query(sql, (err, result) => {
                    if (result.length == 1){
                        socket.emit("re_prepare", this.num + 1, this.starttimeleft);
                        socket.join(this.roomname);
                        this.players[this.num] = new Array(result[0]["userindex"], username, id, socket, result[0]["stars"], 2, 0);
                        this.num ++;
                    } else {
                        socket.emit("re_config_username", "failed");
                    }
                });
                connection.release();
            });
        }
    }

    removeplayer(socket){
        if (this.socketinroom(socket)){
            for (var i = 0; i < this.num; i++){
                if (this.players[i][3].id == socket.id) {
                    this.players.splice(i, 1);
                    break;
                }
            }
            this.num--;
            socket.leave(this.roomname);
            return true;
        } else {
            return false;
        }
    }

    startgame(){
        pool.getConnection((err, connection) => {
            var sql = `UPDATE calendar SET status=1 WHERE gameindex=${this.index}`;
            connection.query(sql);
            connection.release();
        });
        this.rank = this.num;
        this.status = on;
        var maparray = createmap(this.num);
        this.mapsize = maparray[0];
        this.map = maparray[1];
        this.generalposes = maparray[2];
        this.towerposes = maparray[3];
        this.players.sort((a, b) => {return a[0]-b[0]});
        var players = new Array();
        for (var i = 0; i < this.num; i++){
            this.steps[this.players[i][0]] = new Array();
            this.maxlandandarmyandcap[this.players[i][0]] = new Array(0, 0, 0);
            players.push(new Array(this.players[i][0], this.players[i][1], this.players[i][4]));
        }
        io.to(this.roomname).emit("startgame", this.mapsize, this.map, players);
        for (var i = 0; i < this.mapsize[1]; i++){
            this.mapstatus[i] = new Array();
            for (var j = 0; j < this.mapsize[0]; j++){
                if (this.map[i][j] == 0){
                    this.mapstatus[i][j] = new Array(0, 0, 0);
                } else {
                    this.mapstatus[i][j] = new Array(3, 0, 0);
                }
            }
        }
        for (var i = 0; i < this.towerposes.length; i++){
            var troops = 40 + Math.floor(Math.random() * 11);
            this.mapstatus[this.towerposes[i][1]][this.towerposes[i][1]] = new Array(2, 0, troops);
        }
        for (var i = 0; i < this.num; i++){
            var generalx = this.generalposes[i][0],
                generaly = this.generalposes[i][1];
            this.mapstatus[generaly][generalx] = new Array(1, players[i][0], 1);
        }
    }

    updategame(){
        this.turns++;
        console.log(this.steps)

        var conductedmoves = new Array();
        // 进行用户动作，屎山代码
        for (var i = 0; i < this.num; i++){
            if (this.players[i][5] != 0){
                var t = this.players[i][0];
                var flag = false;
                for (var j = 0; j < this.steps[t].length; j++){
                    if (this.steps[t][j][0][0] == -1){
                        if (this.turns == this.steps[t][j][0][1]){
                            this.goneutral(t);
                        }
                    } else if (0 <= this.steps[t][j][0][1] < this.mapsize[1] && 0 <= this.steps[t][j][0][0] < this.mapsize[0]) {
                        if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][1] == t) {
                            if (this.steps[t][j][1] == 1) {
                                if (0 <= this.steps[t][j][0][1] - 1){
                                    if (this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][0] != 3 && this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] > 1){
                                        flag = true;
                                        conductedmoves[t] = new Array(this.steps[t][j][0][0], this.steps[t][j][0][1]);
                                        if (this.steps[t][j][2]){
                                            if (this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] += Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                                if (this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] = - this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2];
                                                    this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                        } else {
                                            if (this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] += this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] -= this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                                if (this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2] = - this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][2];
                                                    this.mapstatus[this.steps[t][j][0][1] - 1][this.steps[t][j][0][0]][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] = 1;
                                        }
                                        break;
                                    }
                                }
                            } else if (this.steps[t][j][1] == 2) {
                                if (this.steps[t][j][0][1] + 1 < this.mapsize[1]){
                                    if (this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][0] != 3 && this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] > 1){
                                        flag = true;
                                        conductedmoves[t] = new Array(this.steps[t][j][0][0], this.steps[t][j][0][1]);
                                        if (this.steps[t][j][2]){
                                            if (this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] += Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                                if (this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] = - this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2];
                                                    this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                        } else {
                                            if (this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] += this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] -= this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                                if (this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2] = - this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][2];
                                                    this.mapstatus[this.steps[t][j][0][1] + 1][this.steps[t][j][0][0]][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] = 1;
                                        }
                                        break;
                                    }
                                }
                            } else if (this.steps[t][j][1] == 3) {
                                if (0 <= this.steps[t][j][0][0] - 1){
                                    if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][0] != 3 && this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] > 1){
                                        flag = true;
                                        conductedmoves[t] = new Array(this.steps[t][j][0][0], this.steps[t][j][0][1]);
                                        if (this.steps[t][j][2]){
                                            if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] += Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                                if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] = - this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2];
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                        } else {
                                            if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] += this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] -= this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                                if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2] = - this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][2];
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] - 1][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] = 1;
                                        }
                                        break;
                                    }
                                } 
                            } else if (this.steps[t][j][1] == 4) {
                                if (this.steps[t][j][0][0] + 1 < this.mapsize[0]){
                                    if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][0] != 3 && this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] > 1){
                                        flag = true;
                                        conductedmoves[t] = new Array(this.steps[t][j][0][0], this.steps[t][j][0][1]);
                                        if (this.steps[t][j][2]){
                                            if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] += Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                                if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] = - this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2];
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] -= Math.ceil(this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] / 2);
                                        } else {
                                            if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][1] == t){
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] += this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                            } else {
                                                this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] -= this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] - 1;
                                                if (this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] < 0) {
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2] = - this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][2];
                                                    this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0] + 1][1] = t;
                                                }
                                            }
                                            this.mapstatus[this.steps[t][j][0][1]][this.steps[t][j][0][0]][2] = 1;
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if (! flag){
                    conductedmoves[t] = new Array(-1, -1);
                }
            }
        }
        for (var i = 0; i < this.num; i++){
            var t = this.players[i][0];
            var k = this.steps[t].length - 1;
            for (var j = 0; i < this.steps[t]; j++){
                if (this.steps[t][j][0][0] == conductedmoves[t][0] || this.steps[t][j][0][1] == conductedmoves[t][1]){
                    k = j;
                    break;
                } 
            }
            this.steps[t].splice(0, j + 1);
        }
        for (var i = 0; i < this.num; i++){
            if (this.players[i][5] != 0){
                var generalx = this.generalposes[i][0],
                    generaly = this.generalposes[i][1];
                var t = this.players[i][0];
                if (this.mapstatus[generaly][generalx][1] != t){
                    this.captureplayer(this.mapstatus[generaly][generalx][1], t, this.generalposes[i]);
                }
            }
        }
        
        if (this.turns%2 == 0) {
            for(var i = 0; i < this.num; i++){
                var generalx = this.generalposes[i][0],
                    generaly = this.generalposes[i][1];
                if (this.mapstatus[generaly][generalx][1] > 0){
                    this.mapstatus[generaly][generalx][2]++;
                }
            }
            for (var i = 0; i < this.towerposes.length; i++){
                if (this.mapstatus[this.towerposes[i][1]][this.towerposes[i][1]][1] > 0){
                    this.mapstatus[this.towerposes[i][1]][this.towerposes[i][1]][2]++;
                }
            }
        }
        if (this.turns%50 == 0){
            for(var i = 0; i < this.mapsize[1]; i++){
                for(var j = 0; j < this.mapsize[0]; j++){
                    if (this.mapstatus[i][j][1] > 0){
                        this.mapstatus[i][j][2] ++;
                    }
                }
            }
        }
        var mapstatusinview = new Array();
        var landandarmynow = new Array();
        for (var i = 0; i < this.num; i++){
            var t = this.players[i][0];
            landandarmynow[t] = new Array(0, 0);
            mapstatusinview[t] = new Array();
            if (this.players[i][5] == 2){
                for (var j = 0; j < this.mapsize[1]; j++){
                    mapstatusinview[t][j] = new Array();
                    for (var k = 0; k < this.mapsize[0]; k++){
                        if (this.mapstatus[j][k][1] == t){
                            landandarmynow[t][0] ++;
                            landandarmynow[t][1] += this.mapstatus[j][k][2];
                        }
                        if (this.insight(k, j, t)){
                            mapstatusinview[t][j][k] = this.mapstatus[j][k];
                        } else {
                            if (this.mapstatus[j][k][0] == 2 || this.mapstatus[j][k][0] == 3){
                                mapstatusinview[t][j][k] = new Array(5, 0, 0);
                            } else {
                                mapstatusinview[t][j][k] = new Array(4, 0, 0);
                            }
                        }
                    }
                }
            }
            if (landandarmynow[t][0] > this.maxlandandarmyandcap[t][0]){
                this.maxlandandarmyandcap[t][0] = landandarmynow[t][0]
            }
            if (landandarmynow[t][1] > this.maxlandandarmyandcap[t][1]){
                this.maxlandandarmyandcap[t][1] = landandarmynow[t][1]
            }
        }
        var players = new Array();
        for (var i = 0; i < this.num; i++){
            players[i] = new Array(this.players[i][0], this.players[i][5], this.players[i][6]);
        }
        for (var i = 0; i < this.num; i++){
            if (this.players[i][5] == 2){
                var t = this.players[i][0];
                this.players[i][3].emit("game_update", this.turns, mapstatusinview[t], landandarmynow, players, conductedmoves[t]);
            }
        }
        if (this.rank == 1){
            for (var i = 0; i < this.num; i++){
                if (this.players[i][5] == 2){
                    this.players[i][3].emit("game_won");
                    var dierindex = this.players[i][0]
                    var staradd = this.calcstaradd();
                    pool.getConnection((err, connection) => {
                        var sql = `UPDATE user SET gamestaradd = gamestaradd + (${staradd}) WHERE userindex = ${dierindex};
                        UPDATE user SET games = CONCAT(games, ", ${this.index}") WHERE userindex = ${dierindex};
                        UPDATE user SET totalturns = totalturns + ${this.turns}, totalgames = totalgames + 1, totalmaxland = totalmaxland + ${this.maxlandandarmyandcap[dierindex][0]}, totalmaxarmy = totalmaxarmy + ${this.maxlandandarmyandcap[dierindex][1]}, totalcaptures = totalcaptures + ${this.maxlandandarmyandcap[dierindex][2]} WHERE userindex = ${dierindex};
                        UPDATE user SET addtimes = totalmaxarmy / totalturns / 10 + totalmaxland / totalturns / 4 + totalcaptures / totalgames WHERE userindex = ${dierindex};
                        UPDATE user SET stars = 200 + gamestaradd * addtimes WHERE userindex = ${dierindex};`
                        connection.query(sql);
                        connection.release();
                    });
                    clearInterval(this.timer);
                    for (var j = 0; j < gamerooms.length; j++){
                        if (gamerooms[j].index == this.index){
                            gamerooms.splice(j ,1);
                            break;
                        }
                    }
                    break;
                }
            }
            players = new Array();
            for (i = 0; i < this.num; i++){
                players[i] = this.players[i][0]
            }
            pool.getConnection((err, connection) => {
                sql = `UPDATE calendar SET players="${JSON.stringify(players)}", turns=${this.turns} WHERE gameindex=${this.index}`;
                connection.query(sql);
                connection.release();
            });
        }
    }

    addstep(socket, pos, dir, is50){
        for (var i = 0; i < this.num; i++){
            if (this.players[i][3].id == socket.id){
                this.steps[this.players[i][0]].push(new Array(pos, dir, is50));
                break;
            }
        }
    }

    popstep(socket){
        for (var i = 0; i < this.num; i++){
            if (this.players[i][3].id == socket.id){
                this.steps[this.players[i][0]].pop();
                break;
            }
        }
    }

    clearstep(socket){
        for (var i = 0; i < this.num; i++){
            if (this.players[i][3].id == socket.id){
                this.steps[this.players[i][0]].length = 0;
                break;
            }
        }
    }

    playerquit(socket){
        for (var i = 0; i < this.num; i++){
            if (this.players[i][3].id == socket.id){
                this.mapstatus[this.generalposes[i][1]][this.generalposes[i][0]][0] = 2;
                this.players[i][5] = 1;
                var t = this.players[i][0];
                this.steps[t].length = 0;
                this.steps[t].push(new Array(-1, this.turns + 120));
                var staradd = this.calcstaradd();
                this.rank --;
                var dierindex = t;
                pool.getConnection((err, connection) => {
                    var sql = `UPDATE user SET gamestaradd = gamestaradd + (${staradd}) WHERE userindex = ${dierindex};
                    UPDATE user SET games = CONCAT(games, ", ${this.index}") WHERE userindex = ${dierindex};
                    UPDATE user SET totalturns = totalturns + ${this.turns}, totalgames = totalgames + 1, totalmaxland = totalmaxland + ${this.maxlandandarmyandcap[dierindex][0]}, totalmaxarmy = totalmaxarmy + ${this.maxlandandarmyandcap[dierindex][1]}, totalcaptures = totalcaptures + ${this.maxlandandarmyandcap[dierindex][2]} WHERE userindex = ${dierindex};
                    UPDATE user SET addtimes = totalmaxarmy / totalturns / 10 + totalmaxland / totalturns / 4 + totalcaptures / totalgames WHERE userindex = ${dierindex};
                    UPDATE user SET stars = 200 + gamestaradd * addtimes WHERE userindex = ${dierindex};`
                    connection.query(sql);
                    connection.release();
                });
                break;
            }
        }
    }

    insight(posx, posy, playerindex){
        if (this.mapstatus[posy][posx][1] == playerindex){
            return true;
        }
        if (0 <= posx - 1){
            if (this.mapstatus[posy][posx-1][1] == playerindex){
                return true;
            }
        }
        if (0 <= posx - 1 && 0 <= posy - 1){
            if (this.mapstatus[posy-1][posx-1][1] == playerindex){
                return true;
            }
        }
        if (0 <= posy - 1){
            if (this.mapstatus[posy-1][posx][1] == playerindex){
                return true;
            }
        }
        if (0 <= posx - 1 && posy + 1 < this.mapsize[1]){
            if (this.mapstatus[posy+1][posx-1][1] == playerindex){
                return true;
            }
        }
        if (posy + 1 < this.mapsize[1]){
            if (this.mapstatus[posy+1][posx][1] == playerindex){
                return true;
            }
        }
        if (posx + 1 < this.mapsize[0] && 0 <= posy - 1){
            if (this.mapstatus[posy-1][posx+1][1] == playerindex){
                return true;
            }
        }
        if (posx + 1 < this.mapsize[0]){
            if (this.mapstatus[posy][posx+1][1] == playerindex){
                return true;
            }
        }
        if (posx + 1 < this.mapsize[0] && posy + 1 < this.mapsize[1]){
            if (this.mapstatus[posy+1][posx+1][1] == playerindex){
                return true;
            }
        }
        return false;
    }

    captureplayer(caperindex, dierindex, diergenpos){
        this.steps[dierindex].length = 0;
        var p = 0;
        for (var i = 0; i < this.num; i++){
            if (this.players[i][0] == dierindex){
                p = i;
                this.players[i][6] = this.rank;
                break;
            }
        }
        if (this.players[p][5] == 2){
            var staradd = this.calcstaradd();
            this.rank --;
            pool.getConnection((err, connection) => {
                var sql = `UPDATE user SET gamestaradd = gamestaradd + (${staradd}) WHERE userindex = ${dierindex};
                UPDATE user SET games = CONCAT(games, ', ${this.index}') WHERE userindex = ${dierindex};
                UPDATE user SET totalturns = totalturns + ${this.turns}, totalgames = totalgames + 1, totalmaxland = totalmaxland + ${this.maxlandandarmyandcap[dierindex][0]}, totalmaxarmy = totalmaxarmy + ${this.maxlandandarmyandcap[dierindex][1]}, totalcaptures = totalcaptures + ${this.maxlandandarmyandcap[dierindex][2]} WHERE userindex = ${dierindex};
                UPDATE user SET addtimes = totalmaxarmy / totalturns / 10 + totalmaxland / totalturns / 4 + totalcaptures / totalgames WHERE userindex = ${dierindex};
                UPDATE user SET stars = 200 + gamestaradd * addtimes WHERE userindex = ${dierindex};`
                connection.query(sql);
                connection.release();
            });
        }
        this.maxlandandarmyandcap[caperindex][2] ++;
        for (var i = 0; i < this.mapsize[1]; i++){
            for (var j = 0; j < this.mapsize[0]; j++){
                if (i == diergenpos[1] && j == diergenpos[0]) {
                    this.mapstatus[i][j][0] = 2;
                    this.mapstatus[i][j][1] = caperindex;
                } else if (this.mapstatus[i][j][1] == dierindex){
                    this.mapstatus[i][j][1] = caperindex;
                    this.mapstatus[i][j][2] = Math.ceil(this.mapstatus[i][j][2] / 2);
                }
            }
        }
        if (this.players[p][5] == 2){
            this.players[p][3].emit("game_lost", caperindex);
        }
        this.players[p][5] = 0;
    }

    goneutral(dierindex){
        this.players[dierindex][5] = 0;
        for (var i = 0; i < this.mapsize[1]; i++){
            for (var j = 0; j < this.mapsize[0]; j++){
                if (i == diergenpos[1] && j == diergenpos[0]) {
                    this.mapstatus[i][j][1] = 0;
                    this.towerposes.push(diergenpos);
                } else if (this.mapstatus[i][j][1] == dierindex){
                    this.mapstatus[i][j][1] = 0;
                }
            }
        }
    }

    calcstaradd(){
        if (this.num % 2 == 1){
            if (this.rank == this.num){
                return - Math.floor(this.num / 2);
            } else if (this.rank == 1) {
                return 2 + Math.floor(this.num / 2);
            } else {
                return Math.floor(this.num / 2) - this.rank + 2;
            }
        } else {
            if (this.rank == this.num){
                return - Math.floor(this.num / 2) + 1;
            } else if (this.rank == 1) {
                return 2 + Math.floor(this.num / 2);
            } else {
                return Math.floor(this.num / 2) - this.rank + 2;
            }
        }
    }
}

var gamerooms = new Array();

var pool = mysql.createPool({
    host : 'localhost',
    user : 'Administrator',
    password : 'NFLSWeb2021',
    database : 'generals',
    multipleStatements: true
});

app.use(express.static("./statics"));

function createmap(players){
    function iftooclose(posx, posy, poslist, maxdistance) { 
        var flag = false;
        poslist.forEach(i => {
            if ((posx - i[0]) ** 2 + (posy - i[1]) ** 2 < maxdistance ** 2){
                flag = true;
            }
        });
        return flag;
    }

    var maplist = new Array();
    var mapx = Math.floor(players**0.5*8) + 5 + Math.floor(Math.random() * 3),
        mapy = Math.floor(players**0.5*8) + 5 + Math.floor(Math.random() * 3);
    var mapsize = new Array(mapx, mapy);

    for (var i = 0; i < mapy; i++ ){
        maplist[i] = new Array;
        for (var j = 0; j < mapx; j++){
            maplist[i][j] = 1;
        }
    }

    for (var i = 0; i < mapy * 2; i++){
        var movex = Math.floor(Math.random() * mapx),
            movey = Math.floor(Math.random() * mapy);
        for (var j = 0; j < mapx; j++){
            maplist[movey][movex] = 0;
            var flag = Math.random();
            if (flag < 0.25){
                movex++;
            } else if (flag < 0.50){
                movex += mapx -1;
            } else if (flag < 0.75){
                movey ++;
            } else {
                movey += mapy - 1;
            }
            movex %= mapx;
            movey %= mapy;
        }
    }

    var towers = new Array();
    for (var i = 0; i < players * 3; i++){
        var towerx = Math.floor(Math.random() * mapx),
            towery = Math.floor(Math.random() * mapy);
        towers[i] = new Array(towerx, towery);
        maplist[towery][towerx] = 1;
    }

    var generals = new Array();
    for (var i = 0; i < players; i++){
        var generalx = Math.floor(Math.random() * mapx),
            generaly = Math.floor(Math.random() * mapy);
        while (iftooclose(generalx, generaly, generals, 7) || maplist[generaly][generalx] == 1 || towers.indexOf(new Array(generalx, generaly)) != -1){
            generalx = Math.floor(Math.random() * mapx);
            generaly = Math.floor(Math.random() * mapy);
        }
        generals[i] = new Array(generalx, generaly);
    }

    return [mapsize, maplist, generals, towers];
}

io.on("connection", (socket) => {
    socket.on("set_username", (username) => {
        if (username.indexOf("<") != -1 || username.indexOf(">") != -1 || username.indexOf("\\") != -1){
            socket.emit("re_set_username", "illegal");
        } else if (username.match(/^[ ]*$/)) {
            socket.emit("re_set_username", "empty");
        } else {
            var sql = `SELECT username FROM user WHERE username='${username}'`;
            pool.getConnection((err, connection) => {
                if (err) {
                    socket.emit("re_set_username", "failed");
                } else {
                    connection.query(sql, (err, result) => {
                        if (err) {
                            socket.emit("re_set_username", "failed");
                        } else {
                            if (result.length == 0) {
                                id = crypto.createHash('SHA256').update(username).digest('hex').toUpperCase();
                                sql = `INSERT INTO user (username, userid, stars, games) VALUE ('${username}', '${id}', 200, '')`;
                                connection.query(sql, (err, result) => {
                                    if (err) {
                                        socket.emit("re_set_username", "empty");
                                    } else {
                                        socket.emit("re_set_username", [username, id]);
                                    }
                                });
                            } else {
                                socket.emit("re_set_username", "occupied");
                            }
                        }
                    });
                }
                connection.release();
            });
        }
    });

    socket.on("config_username", (username, id) => {
        pool.getConnection((err, connection) => {
            var sql = `SELECT username FROM user WHERE username='${username}' AND userid='${id}'`
            connection.query(sql, (err, result) => {
                if (err) {
                    socket.emit("re_config_username", "failed");
                } else {
                    if (result.length == 1){
                        socket.emit("re_config_username", "successful");
                    } else {
                        socket.emit("re_config_username", "failed");
                    }
                }
            });
            connection.release();
        });
    });

    socket.on("get_rank", (username, id) => {
        pool.getConnection((err, connection) => {
            var sql = "SELECT username,userid,stars,@curRank :=IF( @prevRank = stars, @curRank, @incRank ) AS rank,@incRank := @incRank + 1,@prevRank := stars \
            FROM user p,( SELECT @curRank := 0, @prevRank := NULL, @incRank := 1 ) r ORDER BY stars DESC;"
            connection.query(sql, (err, result) => {
                var stars = 0, 
                    rank = -1;
                var l = result.length;
                for (var i = 0; i < l; i++){
                    if (result[i]["username"] == username && result[i]["userid"] == id){
                        stars = result[i]["stars"];
                        rank = result[i]["rank"];
                        break;
                    }
                }
                socket.emit("re_get_rank", stars, rank);
            });
            connection.release();
        });
    });

    socket.on("leaderboard", (username, id) => {
        pool.getConnection((err, connection) => {
            sql = "SELECT username,userid,stars,@curRank :=IF( @prevRank = stars, @curRank, @incRank ) AS rank,@incRank := @incRank + 1,@prevRank := stars \
            FROM user p,( SELECT @curRank := 0, @prevRank := NULL, @incRank := 1 ) r ORDER BY stars DESC;"
            connection.query(sql, (err, result) => {
                var total = (result.length > 200) ? 200 : result.length;
                var myrank = -1;
                var ranks = new Array();
                for (var i = 0; i < total ; i++ ){
                    ranks[i] = new Array(result[i]["rank"], result[i]["username"], result[i]["stars"]);
                    if (result[i]["username"] == username && result[i]["userid"] == id){
                        myrank = i;
                    }
                }
                socket.emit("re_leaderboard", total, myrank, ranks)
            });
            connection.release();
        });
    });

    socket.on("calendar", () => {
        pool.getConnection((err, connection) => {
            sql = "SELECT gameindex, status, starttime, turns, result FROM calendar ORDER BY starttime ASC";
            connection.query(sql, (err, result) => {
                var now = new Date().getTime();
                for (var i = 0; i < result.length; i++){
                    if (new Date(result[i]["starttime"]).getTime() < now && result[i]["status"] == 0){
                        rsql = `UPDATE calendar SET status = 2 WHERE gameindex=${result[i]["gameindex"]}`;
                        connection.query(rsql);
                    }
                }
                connection.query(sql, (err, result) => {
                    socket.emit("re_calendar", result);
                });
            });
            connection.release();
        });
    });

    socket.on("startprepare", (username, id) => {
        var flag = -1;
        for (var i = 0; i < gamerooms.length; i++){
            if (gamerooms[i].status == waiting){
                flag = i;
                break;
            }
        }
        if (flag == -1){
            pool.getConnection((err, connection) => {
                sql = "SELECT gameindex, starttime FROM calendar WHERE status=0 ORDER BY gameindex";
                connection.query(sql, (err, result) => {
                    if (result.length == 0){
                        socket.emit("nomore");
                    } else {
                        var now = new Date().getTime();
                        for (var i = 0; i < result.length; i++){
                            if (new Date(result[i]["starttime"]).getTime() < now){
                                sql = `UPDATE calendar SET status = 2 WHERE gameindex='${result[i]["gameindex"]}'`;
                                connection.query(sql);
                            } else {
                                gamerooms.push(new gameroom(parseInt(result[i]["gameindex"]), Math.ceil((new Date(result[i]["starttime"]).getTime() - now)/1000)));
                                gamerooms.slice(-1)[0].addplayer(socket, username, id);
                                break;
                            }
                        }
                    }
                });
                connection.release();
            });
        } else {
            gamerooms[flag].addplayer(socket, username, id);
        }
    });

    socket.on("move", (pos, direction, is50) => {
        for (var i = 0; i < gamerooms.length; i++){
            if (gamerooms[i].status == on){
                gamerooms[i].addstep(socket, pos, direction, is50);
            }
        }
    });

    socket.on("popstep", () => {
        for (var i = 0; i < gamerooms.length; i++){
            if (gamerooms[i].socketinroom(socket) && gamerooms[i].status == on){
                gamerooms[i].popstep(socket);
                break;
            }
        }
    });

    socket.on("clearstep", () => {
        for (var i = 0; i < gamerooms.length; i++){
            if (gamerooms[i].socketinroom(socket) && gamerooms[i].status == on){
                gamerooms[i].clearstep(socket);
                break;
            }
        }
    });

    socket.on("stopprepare", () => {
        gamerooms.forEach(room => {
            room.removeplayer(socket);
        });
    });

    socket.on("disconnect", (reason) => {
        gamerooms.forEach(room => {
            if (room.socketinroom(socket)){
                if (room.status == waiting){
                    room.removeplayer(socket);
                } else if (room.status == on){
                    room.playerquit(socket);
                }
            }
        });
    });
});

server.listen(8080, () => {
    console.log('listening on *:8080');
});