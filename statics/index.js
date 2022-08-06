function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

function setCookie(cname,cvalue,exdays){
    var d = new Date();
    d.setTime(d.getTime()+(exdays*24*60*60*1000));
    var expires = "expires="+d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function FormatSecond(second) {
    var secondType = typeof second;
    if (secondType === "number" || secondType === "string") {
        second = parseInt(second);
        var mimute = Math.floor(second / 60);
        second = second - mimute * 60;
        if (mimute < 100){
            return ("0" + mimute).slice(-2) + ":" + ("0" + second).slice(-2);
        } else {
            return mimute + ":" + ("0" + second).slice(-2);
        }
    } else {
        return "00:00";
    }
}

function showcalender() {
    socket.emit("calendar");
    $("#calenderback").show();
}

function hidecalender() {
    $("#calenderback").hide();
}

function showrule() {
    $("#ruleback").show();
}

function hiderule() {
    $("#ruleback").hide();
}

function showusername() {
    var username = getCookie("username"),
        id = getCookie("id");
    if (username == "" && id == "") {
        $("#userback").show();
    } else {
        $("#useralertback").show();
    }
}

function hideusername() {
    $("#userback").hide();
    $("#usersetfailed").hide();
    $("#setusername").val("");
}

function showuseralert() {
    $("#useralertback").show();
}

function hideuseralert() {
    $("#useralertback").hide();
}

function showleaderboard(){
    $("#leaderboardback").show();
}

function hideleaderboard(){
    $("#leaderboardback").hide();
}

function setusername() {
    var username = $("#setusername").val();
    socket.emit("set_username", username);
}

$(document).ready(function() {
    $(".calenderclickhide").on('click', function() {
        hidecalender();
    });
    $(".ruleclickhide").on("click", function() {
        hiderule();
    });
    $(".userclickhide").on("click", function() {
        hideusername();
    });
    $(".leaderboardclickhide").on("click", function () {
        hideleaderboard();
    });
    $("#leaderboardbutton").on("click", function () {
        showleaderboard();
        socket.emit("leaderboard", getCookie("username"), getCookie("id"));
        socket.emit("get_rank", getCookie("username"), getCookie("id"));
    });
    $("#exitgame").on("click", function(){
        $("#endalert").hide();
        $("#playmap").hide();
        $("#game-leaderboard").hide();
        $("#turncounter").hide();
        $("#main").show();
    });
    window.addEventListener("wheel", function(e) {
        let evt = e || window.event;
        evt.preventDefault();
        if (evt.deltaY > 0) {
            if (size > 20) {
                size -= 5;
            }
        } else {
            if (size < 100) {
                size += 5;
            }
        }
        $("#playmap td").css({
            "width": size + "px",
            "height": size + "px",
            "min-width": size + "px",
            "min-height": size + "px",
            "max-width": size + "px",
            "max-height": size + "px",
            "font-size": size * 0.4 + "px",
            "background-size": size * 0.8 + "px " + size * 0.8 + "px"
        });
        showsteps(steps, mapsize[0], mapsize[1]);
    }, {
        passive: false
    });
    $(document).mousedown(function(e) {
        mousex = e.pageX;
        mousey = e.pageY;
        on = true;
    });
    $(document).mouseup(function() {
        on = false;
    });
    $(document).mousemove(function(e) {
        if (on) {
            left += e.pageX - mousex;
            tops += e.pageY - mousey;
            mousex = e.pageX;
            mousey = e.pageY;
            $("#playmap").css({
                "top": tops + "px",
                "left": left + "px"
            });
        }
    });
});

var preparestatus = 0;

function prepare() {
    if (getCookie("username") == ""){
        showusername();
    } else {
        if (preparestatus == 0){
            $("#waitingbox").css("top", "-60px");
            socket.emit("startprepare", getCookie("username"), getCookie("id"));
            preparestatus = 1;
        }
    }
}   

function stopprepare() {
    if (preparestatus == 1){
        $("#waitingbox").css("top", "-122px");
        socket.emit("stopprepare");
        preparestatus = 0;
    }
}

var size = 50,
    mousex = 0,
    mousey = 0,
    tops = 0,
    left = 0,
    on = false;

var colorlist = ["red", "green", "lightblue", "purple", "teal", "blue", "orange", "maroon", "gold", "pink", "brown", "lightgreen", "purpleblue"];

var mycolor, myindex,
    playercolors = {"0": "gray"},
    players;

var steps = new Array();
function showsteps(s, w, h){
    $("#playmap tfoot").html("");
    var x, y, dir, div;
    for (var i = 0; i < s.length; i++){
        x = s[i][0];
        y = s[i][1];
        dir = s[i][2];
        div = $("<tr></tr>")
        if (dir == 1){
            div.text("↑");
            div.addClass("totop");
            div.css({
                "top": (y * (size + 4) + 2) + "px",
                "left": ((x + 0.5) * (size + 4)) + "px"
            });
        } else if (dir == 2){
            div.text("↓");
            div.addClass("tobottom");
            div.css({
                "bottom": ((h - y - 1) * (size + 4) + 2) + "px",
                "left": ((x + 0.5) * (size + 4)) + "px"
            });
        } else if (dir == 3){
            div.text("←");
            div.addClass("toleft");
            div.css({
                "top": ((y + 0.5) * (size + 4)) + "px",
                "left": (x * (size + 4) + 2) + "px"
            });
        } else if (dir == 4){
            div.text("→");
            div.addClass("toright");
            div.css({
                "top": ((y + 0.5) * (size + 4)) + "px",
                "right": ((w - x - 1) * (size + 4) + 2) + "px"
            });
        }
        $("#playmap tfoot").append(div);
    }
}

var selected = false,
    moveable = false,
    is50 = false;
var mapsize;    
var mapstatus = new Array();

function updatemap(w, h, ms, lsms, mtds){
    for (var i = 0; i < h; i++){
        for (var j = 0; j < w; j++){
            if (ms[i][j] != lsms[i][j]){
                mtds.eq(i * w + j).removeClass("fog obstacle neutral mountain city general").removeClass(colorlist.join(" ")).text("");
                switch (ms[i][j][0]){
                    case 0:
                        if (ms[i][j][2] == 0 && ms[i][j][1] == 0){
                            mtds.eq(i * w + j).text("");
                        } else {
                            mtds.eq(i * w + j).addClass(playercolors[ms[i][j][1].toString()]).text(ms[i][j][2]);
                        }
                        break;
                    case 1:
                        mtds.eq(i * w + j).addClass(playercolors[ms[i][j][1].toString()]).addClass("general").text(ms[i][j][2]);
                        break;
                    case 2:
                        mtds.eq(i * w + j).addClass(playercolors[ms[i][j][1].toString()]).addClass("city").text(ms[i][j][2]);
                        break;
                    case 3:
                        mtds.eq(i * w + j).addClass("mountain");
                        break;
                    case 4:
                        mtds.eq(i * w + j).addClass("fog");
                        break;
                    case 5:
                        mtds.eq(i * w + j).addClass("obstacle");
                        break;
                }
            }
        }
    }
}

const socket = io();
socket.on("loggedtwice", function () {
    alert("重复登录！你可能打开了两个或以上标签页，请确保在游戏时注意只打开一个标签页");
    location.reload();
});

socket.on("connect", function () {
    hideuseralert();
    $("#useralert div").text("不支持用户名修改");
    $(".useralertclickhide").on("click", function() {
        hideuseralert();
    });
    var username = getCookie("username"),
        id = getCookie("id");
    socket.emit("config_username", username, id);
    socket.emit("get_rank", username, id);
    setInterval(function(){
        socket.emit("get_rank", username, id);
    }, 60000);
});

socket.on("re_set_username", function (data) {
    if (data == "failed"){
        $("#usersetfailed").text("服务器错误");
        $("#usersetfailed").show();
    } else if (data == "occupied"){
        $("#usersetfailed").text("用户名已被占用");
        $("#usersetfailed").show();
    } else if (data == "illegal") {
        $("#usersetfailed").text("含有非法字符 < 或 > 或 \\");
        $("#usersetfailed").show();
    } else if (data == "empty") {
        $("#usersetfailed").text("用户名为空或全是空格");
        $("#usersetfailed").show();
    } else {
        var username = data[0],
            id = data[1];
        setCookie("username", username, 1000);
        setCookie("id", id, 1000);
        hideusername();
        $("#username").val(username);
    }
});

socket.on("re_config_username", function(data){
    if (data == "successful"){
        $("#username").val(getCookie("username"));
    } else {
        setCookie("username", "", -1);
        setCookie("id", "", -1);
    }
});

socket.on("re_get_rank", function(stars, rank){
    $("#stars").text(stars.toFixed(1));
    if(rank == -1){
        $("#ranks").text("-");
    }else{
        $("#ranks").text(rank);
    }
});

socket.on("re_leaderboard", function(total, myrank, data){
    var t = parseInt(total),
        m = parseInt(myrank),
        d = data;
    $("#leaderboardtable tbody").html('<tr><th>排名</th><th>用户名</th><th><span class="star">★</span></th></tr>');
    for (var i=0; i<t; i++){
        var tr = $("<tr></tr>");
        $("#leaderboardtable tbody").append(tr);
    }
    for (var i=0; i<t; i++){
        var r = d[i][0],
            u = d[i][1],
            s = Math.round(d[i][2]);
        $("#leaderboardtable tbody tr").eq(i+1).html("<td>"+r+"</td><td>"+u+"</td><td>"+s+"</td>");
        if (m == i){
            $("#leaderboardtable tbody tr").eq(i+1).addClass("self");
        }
    }
});

socket.on("re_calendar", (data) => {
    $("#calendertable tbody").html('<tr><th>时间</th><th>状态</th><th>回合</th></tr>');
    for (var i=0; i<data.length; i++){
        var tr = $("<tr></tr>");
        $("#calendertable tbody").append(tr);
    }
    for (var i=0; i<data.length; i++){
        var s = data[i]["status"],
            t = data[i]["starttime"],
            h = data[i]["turns"],
            r = data[i]["result"];
        var d = new Date(t).toLocaleString();
        var ss, tt;
        switch(s){
            case 0:
                ss = "未开始";
                tt = "-";
                break;
            case 1:
                ss = "进行中";
                tt = "-";
                break;
            case 2:
                ss = "已结束";
                tt = h;
                break;
        }
        var ht = `<td>${d}</td><td>${ss}</td><td>${tt}</td>`;
        $("#calendertable tbody tr").eq(i+1).html(ht);
    }
})

socket.on("nomore", function(){
    $("#waitingbox").css("top", "-122px");
    $("#useralert div").text("没有更多比赛了，请联系管理员");
    showuseralert();
    preparestatus = 0;
});

socket.on("noplayers", function(){
    $("#waitingbox").css("top", "-122px");
    $("#useralert div").text("参与人数太少，请等待下一场比赛");
    showuseralert();
    preparestatus = 0;
});

socket.on("re_prepare", function(num, time){
    $("#timeleft").text(FormatSecond(time));
    $("#players").text(num);
});

socket.on("startgame", function(mapsiz, map, player){
    mapsize = mapsiz;
    players = player;
    mapstatus = new Array();
    lastmapstatus = new Array();
    steps = new Array();
    playercolors = {"0": "neutral"};
    for (var i = 0; i < players.length; i++){
        playercolors[players[i][0].toString()] = colorlist[i];
        if (players[i][1] == getCookie("username")){
            mycolor = colorlist[i];
            myindex = players[i][0];
        }
    }
    $("#playmap tbody").html("");
    $("#game-leaderboard tbody").html("");
    $("#generalcolor").css("color", `var(--map-color-${mycolor})`);
    $("#waitingbox").css("top", "-122px");
    $("#main").hide();
    $("#gamestart").show();
    var width = mapsize[0],
        height = mapsize[1];
    for (var i = 0; i < height; i++) {
        $("#playmap tbody").append($("<tr></tr>"));
    }
    for (var i = 0; i < width; i++) {
        $("#playmap tbody tr").append($("<td></td>"));
    }
    var maptd = $("#playmap tbody td");
    for (var i = 0; i < height; i++){
        mapstatus[i] = new Array();
        lastmapstatus[i] = new Array();
        for (var j = 0; j < height; j++){
            if (map[i][j] == 0){
                mapstatus[i][j] = new Array(4, 0, 0);
                lastmapstatus[i][j] = new Array(4, 0, 0);
                maptd.eq(i * width + j).addClass("fog");
            } else {
                mapstatus[i][j] = new Array(5, 0, 0);
                lastmapstatus[i][j] = new Array(5, 0, 0);
                maptd.eq(i * width + j).addClass("obstacle");
            }
        }
    }
    $("#game-leaderboard tbody").html("<tr><th><span class='star'>★</span></th><th>用户名</th><th>兵力</th><th>土地</th></tr>");
    for (var i = 0; i < players.length; i++){
        $("#game-leaderboard tbody").append($("<tr></tr>"));
        var ht = `<td><span class="star">★</span> ${Math.round(players[i][2])}</td><td class="${playercolors[players[i][0].toString()]}" style="color:white">${players[i][1]}</td><td></td><td></td>`;
        $("#game-leaderboard tbody tr").eq(i+1).html(ht);
    }
    $("#playmap").click(function (e) { 
        e.preventDefault();
        var mx = Math.floor((e.pageX - left)/(size + 4)),
            my = Math.floor((e.pageY - tops)/(size + 4));
        if (mx == selected[0] && my == selected[1] && is50) {
            is50 = false;
            $("#playmap tbody .selected").removeClass("is50");
        } else if (mx == selected[0] && my == selected[1] && !is50){
            is50 = true;
            $("#playmap tbody .selected").addClass("is50");
        } else if (moveable){
            if (moveable.indexOf(mx + " " + my) != -1) {
                console.log("move", selected, moveable.indexOf(mx + " " + my)+1, is50);
                socket.emit("move", selected, moveable.indexOf(mx + " " + my)+1, is50);
                steps.push(new Array(selected[0], selected[1], moveable.indexOf(mx + " " + my)+1));
                $("#playmap tbody .selected").removeClass("is50");
                $("#playmap tbody .selected").removeClass("selected");
                $("#playmap tbody .moveable").removeClass("moveable");
                showsteps(steps, width, height);
                moveable = new Array();
                selected = new Array(mx, my);
                is50 = false;
                maptd.eq(my * width + mx).addClass("selected");
                if (0 <= my-1){
                    if (mapstatus[my-1][mx][0] != 3){
                        maptd.eq(width*(my-1)+mx).addClass("moveable");
                        moveable[0] = mx + " " + (my-1)
                    }
                }
                if (my+1 < height){
                    if (mapstatus[my+1][mx][0] != 3){
                        maptd.eq(width*(my+1)+mx).addClass("moveable");
                        moveable[1] = mx + " " + (my+1)
                    }
                }
                if (0 <= mx-1){
                    if (mapstatus[my][mx-1][0] != 3){
                        maptd.eq(width*my+mx-1).addClass("moveable");
                        moveable[2] = (mx-1) + " " + my
                    }
                }
                if (mx+1 < width){
                    if (mapstatus[my][mx+1][0] != 3){
                        maptd.eq(width*my+mx+1).addClass("moveable");
                        moveable[3] = (mx+1) + " " + my
                    }
                }
                showsteps(steps, mapsize[0], mapsize[1]);
            } else if (mapstatus[my][mx][1] == myindex){
                is50 = false;
                if (selected){
                    $("#playmap tbody .selected").removeClass("is50");
                    $("#playmap tbody .selected").removeClass("selected");
                    $("#playmap tbody .moveable").removeClass("moveable");
                }
                moveable = new Array();
                selected = new Array(mx, my);
                maptd.eq(my * width + mx).addClass("selected");
                if (0 <= my-1){
                    if (mapstatus[my-1][mx][0] != 3){
                        maptd.eq(width*(my-1)+mx).addClass("moveable");
                        moveable[0] = mx + " " + (my-1)
                    }
                }
                if (my+1 < height){
                    if (mapstatus[my+1][mx][0] != 3){
                        maptd.eq(width*(my+1)+mx).addClass("moveable");
                        moveable[1] = mx + " " + (my+1)
                    }
                }
                if (0 <= mx-1){
                    if (mapstatus[my][mx-1][0] != 3){
                        maptd.eq(width*my+mx-1).addClass("moveable");
                        moveable[2] = (mx-1) + " " + my
                    }
                }
                if (mx+1 < width){
                    if (mapstatus[my][mx+1][0] != 3){
                        maptd.eq(width*my+mx+1).addClass("moveable");
                        moveable[3] = (mx+1) + " " + my
                    }
                }
            } else {
                if (selected){
                    $("#playmap tbody .selected").removeClass("is50");
                    $("#playmap tbody .selected").removeClass("selected");
                    $("#playmap tbody .moveable").removeClass("moveable");
                }
                is50 = false;
                selected = false;
                moveable = false;
            }
        } else if (mapstatus[my][mx][1] == myindex){
            is50 = false;
            if (selected){
                $("#playmap tbody .selected").removeClass("is50");
                $("#playmap tbody .selected").removeClass("selected");
                $("#playmap tbody .moveable").removeClass("moveable");
            }
            moveable = new Array();
            selected = new Array(mx, my);
            maptd.eq(my * width + mx).addClass("selected");
            if (0 <= my-1){
                if (mapstatus[my-1][mx][0] != 3){
                    maptd.eq(width*(my-1)+mx).addClass("moveable");
                    moveable[0] = mx + " " + (my-1)
                }
            }
            if (my+1 < height){
                if (mapstatus[my+1][mx][0] != 3){
                    maptd.eq(width*(my+1)+mx).addClass("moveable");
                    moveable[1] = mx + " " + (my+1)
                }
            }
            if (0 <= mx-1){
                if (mapstatus[my][mx-1][0] != 3){
                    maptd.eq(width*my+mx-1).addClass("moveable");
                    moveable[2] = (mx-1) + " " + my
                }
            }
            if (mx+1 < width){
                if (mapstatus[my][mx+1][0] != 3){
                    maptd.eq(width*my+mx+1).addClass("moveable");
                    moveable[3] = (mx+1) + " " + my
                }
            }
        } else {
            if (selected){
                $("#playmap tbody .selected").removeClass("selected").text(mapstatus[selected[1]][selected[0]][2]);
                $("#playmap tbody .moveable").removeClass("moveable");
            }
            is50 = false;
            selected = false;
            moveable = false;
        }
    });
    $(document).keydown(function (e) { 
        var key = e.which;
        if (key == 65){
            if (selected){
                if (moveable.indexOf((selected[0]-1)+" "+selected[1]) == 2){
                    var mx = selected[0] - 1,
                        my = selected[1];
                    console.log("move", selected, 3, is50);
                    socket.emit("move", selected, 3, is50);
                    steps.push(new Array(selected[0], selected[1], 3));
                    $("#playmap tbody .selected").removeClass("is50");
                    $("#playmap tbody .selected").removeClass("selected");
                    $("#playmap tbody .moveable").removeClass("moveable");
                    moveable = new Array();
                    selected = new Array(mx, my);
                    is50 = false;
                    maptd.eq(my * width + mx).addClass("selected");
                    if (0 <= my-1){
                        if (mapstatus[my-1][mx][0] != 3){
                            maptd.eq(width*(my-1)+mx).addClass("moveable");
                            moveable[0] = mx + " " + (my-1)
                        }
                    }
                    if (my+1 < height){
                        if (mapstatus[my+1][mx][0] != 3){
                            maptd.eq(width*(my+1)+mx).addClass("moveable");
                            moveable[1] = mx + " " + (my+1)
                        }
                    }
                    if (0 <= mx-1){
                        if (mapstatus[my][mx-1][0] != 3){
                            maptd.eq(width*my+mx-1).addClass("moveable");
                            moveable[2] = (mx-1) + " " + my
                        }
                    }
                    if (mx+1 < width){
                        if (mapstatus[my][mx+1][0] != 3){
                            maptd.eq(width*my+mx+1).addClass("moveable");
                            moveable[3] = (mx+1) + " " + my
                        }
                    }
                }
            }
        }else if (key == 68){
            if (selected){
                if (moveable.indexOf((selected[0]+1)+" "+selected[1]) == 3){
                    var mx = selected[0] + 1,
                        my = selected[1];
                    console.log("move", selected, 4, is50);
                    socket.emit("move", selected, 4, is50);
                    steps.push(new Array(selected[0], selected[1], 4));
                    $("#playmap tbody .selected").removeClass("is50");
                    $("#playmap tbody .selected").removeClass("selected");
                    $("#playmap tbody .moveable").removeClass("moveable");
                    moveable = new Array();
                    selected = new Array(mx, my);
                    is50 = false;
                    maptd.eq(my * width + mx).addClass("selected");
                    if (0 <= my-1){
                        if (mapstatus[my-1][mx][0] != 3){
                            maptd.eq(width*(my-1)+mx).addClass("moveable");
                            moveable[0] = mx + " " + (my-1)
                        }
                    }
                    if (my+1 < height){
                        if (mapstatus[my+1][mx][0] != 3){
                            maptd.eq(width*(my+1)+mx).addClass("moveable");
                            moveable[1] = mx + " " + (my+1)
                        }
                    }
                    if (0 <= mx-1){
                        if (mapstatus[my][mx-1][0] != 3){
                            maptd.eq(width*my+mx-1).addClass("moveable");
                            moveable[2] = (mx-1) + " " + my
                        }
                    }
                    if (mx+1 < width){
                        if (mapstatus[my][mx+1][0] != 3){
                            maptd.eq(width*my+mx+1).addClass("moveable");
                            moveable[3] = (mx+1) + " " + my
                        }
                    }
                }
            }
        }else if (key == 87){
            if (selected){
                if (moveable.indexOf(selected[0]+" "+(selected[1]-1)) == 0){
                    var mx = selected[0],
                        my = selected[1] - 1;
                    console.log("move", selected, 1, is50);
                    socket.emit("move", selected, 1, is50);
                    steps.push(new Array(selected[0], selected[1], 1));
                    $("#playmap tbody .selected").removeClass("is50");
                    $("#playmap tbody .selected").removeClass("selected");
                    $("#playmap tbody .moveable").removeClass("moveable");
                    moveable = new Array();
                    selected = new Array(mx, my);
                    is50 = false;
                    maptd.eq(my * width + mx).addClass("selected");
                    if (0 <= my-1){
                        if (mapstatus[my-1][mx][0] != 3){
                            maptd.eq(width*(my-1)+mx).addClass("moveable");
                            moveable[0] = mx + " " + (my-1)
                        }
                    }
                    if (my+1 < height){
                        if (mapstatus[my+1][mx][0] != 3){
                            maptd.eq(width*(my+1)+mx).addClass("moveable");
                            moveable[1] = mx + " " + (my+1)
                        }
                    }
                    if (0 <= mx-1){
                        if (mapstatus[my][mx-1][0] != 3){
                            maptd.eq(width*my+mx-1).addClass("moveable");
                            moveable[2] = (mx-1) + " " + my
                        }
                    }
                    if (mx+1 < width){
                        if (mapstatus[my][mx+1][0] != 3){
                            maptd.eq(width*my+mx+1).addClass("moveable");
                            moveable[3] = (mx+1) + " " + my
                        }
                    }
                }
            }
        }else if (key == 83){
            if (selected){
                if (moveable.indexOf(selected[0]+" "+(selected[1]+1)) == 1){
                    var mx = selected[0],
                        my = selected[1] + 1;
                    console.log("move", selected, 2, is50);
                    socket.emit("move", selected, 2, is50);
                    steps.push(new Array(selected[0], selected[1], 2));
                    $("#playmap tbody .selected").removeClass("is50");
                    $("#playmap tbody .selected").removeClass("selected");
                    $("#playmap tbody .moveable").removeClass("moveable");
                    moveable = new Array();
                    selected = new Array(mx, my);
                    is50 = false;
                    maptd.eq(my * width + mx).addClass("selected");
                    if (0 <= my-1){
                        if (mapstatus[my-1][mx][0] != 3){
                            maptd.eq(width*(my-1)+mx).addClass("moveable");
                            moveable[0] = mx + " " + (my-1)
                        }
                    }
                    if (my+1 < height){
                        if (mapstatus[my+1][mx][0] != 3){
                            maptd.eq(width*(my+1)+mx).addClass("moveable");
                            moveable[1] = mx + " " + (my+1)
                        }
                    }
                    if (0 <= mx-1){
                        if (mapstatus[my][mx-1][0] != 3){
                            maptd.eq(width*my+mx-1).addClass("moveable");
                            moveable[2] = (mx-1) + " " + my
                        }
                    }
                    if (mx+1 < width){
                        if (mapstatus[my][mx+1][0] != 3){
                            maptd.eq(width*my+mx+1).addClass("moveable");
                            moveable[3] = (mx+1) + " " + my
                        }
                    }
                }
            }
        }else if (key == 90){
            if (selected){
                if (is50){
                    is50 = false;
                    $("#playmap tbody .is50").removeClass("is50");
                } else {
                    is50 = true;
                    $("#playmap tbody .selected").addClass("is50");
                }
            }
        }else if (key == 69){
            if (steps.length > 0){
                socket.emit("popstep");
                var last = steps.pop();
                console.log(last)
                var mx = last[0],
                    my = last[1];
                $("#playmap tbody .selected").removeClass("is50");
                $("#playmap tbody .selected").removeClass("selected");
                $("#playmap tbody .moveable").removeClass("moveable");
                moveable = new Array();
                selected = new Array(mx, my);
                is50 = false;
                maptd.eq(my * width + mx).addClass("selected");
                if (0 <= my-1){
                    if (mapstatus[my-1][mx][0] != 3){
                        maptd.eq(width*(my-1)+mx).addClass("moveable");
                        moveable[0] = mx + " " + (my-1)
                    }
                }
                if (my+1 < height){
                    if (mapstatus[my+1][mx][0] != 3){
                        maptd.eq(width*(my+1)+mx).addClass("moveable");
                        moveable[1] = mx + " " + (my+1)
                    }
                }
                if (0 <= mx-1){
                    if (mapstatus[my][mx-1][0] != 3){
                        maptd.eq(width*my+mx-1).addClass("moveable");
                        moveable[2] = (mx-1) + " " + my
                    }
                }
                if (mx+1 < width){
                    if (mapstatus[my][mx+1][0] != 3){
                        maptd.eq(width*my+mx+1).addClass("moveable");
                        moveable[3] = (mx+1) + " " + my
                    }
                }
            }
        }else if (key == 81){
            socket.emit("clearstep");
            var mx = steps[0][0],
                my = stpes[0][1];
            $("#playmap tbody .selected").removeClass("is50");
            $("#playmap tbody .selected").removeClass("selected");
            $("#playmap tbody .moveable").removeClass("moveable");
            moveable = new Array();
            selected = new Array(mx, my);
            is50 = false;
            maptd.eq(my * width + mx).addClass("selected");
            if (0 <= my-1){
                if (mapstatus[my-1][mx][0] != 3){
                    maptd.eq(width*(my-1)+mx).addClass("moveable");
                    moveable[0] = mx + " " + (my-1);
                }
            }
            if (my+1 < height){
                if (mapstatus[my+1][mx][0] != 3){
                    maptd.eq(width*(my+1)+mx).addClass("moveable");
                    moveable[1] = mx + " " + (my+1);
                }
            }
            if (0 <= mx-1){
                if (mapstatus[my][mx-1][0] != 3){
                    maptd.eq(width*my+mx-1).addClass("moveable");
                    moveable[2] = (mx-1) + " " + my;
                }
            }
            if (mx+1 < width){
                if (mapstatus[my][mx+1][0] != 3){
                    maptd.eq(width*my+mx+1).addClass("moveable");
                    moveable[3] = (mx+1) + " " + my;
                }
            }
            steps.length = 0;
        }
        showsteps(steps, mapsize[0], mapsize[1]);
    });
});

socket.on("gameon", function() {
    $("#gamestart").hide();
    $("#playmap").show();
    $("#game-leaderboard").show();
    $("#turncounter").show();
});

socket.on("game_update", function(turns, mapstat, landandarmy, playernow, conductedmove) {
    $("#turncounter span").text(Math.floor(turns / 2));
    var maptd = $("#playmap tbody td");
    updatemap(mapsize[0], mapsize[1], mapstat, mapstatus, maptd);
    mapstatus = mapstat;
    var f = steps.length - 1;
    for (var i = 0; i < f; i++){
        if (steps[i][0] == conductedmove[0] && steps[i][1] == conductedmove[1]){
            f = i;
            break;
        }
    }
    steps.splice(0, f + 1);
    totals = new Array()
    for (var i = 0; i < players.length; i++){
        var t = players[i][0];
        totals[i] = new Array(t, players[i][2], landandarmy[t][1], landandarmy[t][0], playernow[i][1], playernow[i][2], players[i][1]);
    }
    totals.sort((a, b) => {
        if (a[5] != b[5]){
            return a[5] - b[5];
        } else if (a[2] != b[2]){
            return b[2] - a[2];
        } else if (a[3] != b[3]){
            return b[3] - a[3];
        } else {
            return a[0] - b[0];
        }
    });
    showsteps(steps, mapsize[0], mapsize[1]);
    $("#game-leaderboard tbody").html("<tr><th><span class='star'>★</span></th><th>用户名</th><th>兵力</th><th>土地</th></tr>");
    for (var i = 0; i < totals.length; i++){
        $("#game-leaderboard tbody").append($("<tr></tr>"));
        var ht = `<td><span class="star">★</span> ${Math.round(totals[i][1])}</td><td class="${playercolors[totals[i][0].toString()]}" style="color:white">${totals[i][6]}</td><td>${totals[i][2]}</td><td>${totals[i][3]}</td>`;
        $("#game-leaderboard tbody tr").eq(i+1).html(ht);
        if (totals[i][4] == 1){
            $("#game-leaderboard tbody tr").eq(i+1).addClass("afk");
        } else if (totals[i][4] == 0){
            $("#game-leaderboard tbody tr").eq(i+1).addClass("dead");
        }
    }
});

socket.on("game_lost", (caper) => {
    $("#endalert").show();
    for (var i = 0; i < players.length; i++){
        if (players[i][0] == caper){
            $("#endalert p").html(`你被<b>${players[i][1]}</b>击败了`);
            break;
        }
    }
    preparestatus = 0;
});

socket.on("game_won", () => {
    $("#endalert").show();
    $("#endalert p").html("你赢了");
    preparestatus = 0;
});