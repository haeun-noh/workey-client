const sendBtn = $("#send-btn");// diary 생성 버튼
const editPageBtn = $("#edit-page-btn");// diary 수정 페이지로 이동 버튼
const editBtn = $("#edit-btn");// diary 수정 버튼 

async function setSendBtn() {
    sendBtn.css('display', '');
    editPageBtn.css('display', 'none');
    editBtn.css('display', 'none');
}

async function setEditPageBtn() {
    editPageBtn.css('display', '');
    sendBtn.css('display', 'none');
    editBtn.css('display', 'none');
}

async function setEditBtn() {
    editBtn.css('display', '');
    editPageBtn.css('display', 'none');
    sendBtn.css('display', 'none');
}

let firstName;
let userId = Cookies.get("user_id");
let diaryId;

// 쿼리스트링값 저장
const url = new URL(window.location.href);
const urlParams = url.searchParams;

// 하나의 diary에 접속했을 경우
console.log(urlParams.get("id"));
if (urlParams.get('id') !== null) {
    diaryId = urlParams.get('id');
    turnOnLock();
    setEditPageBtn();
    getDiaryData();
} else {
    turnOffLock();
    // 이미 답했다면 답한 diary를 불러오자
    $.ajax({
        type: 'get',           // 타입 (get, post, put 등등)
        url: `http://localhost:3000/diaries/${userId}`,           // 요청할 서버url
        async: true,            // 비동기화 여부 (default : true)
        dataType: 'json',       // 데이터 타입 (html, xml, json, text 등등)
        data: {},
        success: async function (result) { // 결과 성공 콜백함수
            let yourDate = String(today).substring(8, 10);
            if (result.length === 0) {// 가장 처음 작성하는 글이라면
                await setUserFirstName();
                await setTodayQuestion(yourDate);
            } else {
                let lastDiaryDate = result[result.length - 1].createdAt.substring(8, 10);
                // 오늘 일기 작성 전이라면
                if (lastDiaryDate !== yourDate) {
                    await setSendBtn();
                    await setUserFirstName();
                    await setTodayQuestion(yourDate);
                } else {// 오늘 일기를 작성한 뒤라면
                    await setEditPageBtn();
                    diaryId = result[result.length - 1].id;
                    getDiaryData();
                }
            }
        }
    });
}

// user firtname 불러오기 
$.support.cors = true;
async function setUserFirstName() {
    $.ajax({
        type: 'get',           // 타입 (get, post, put 등등)
        url: 'http://localhost:3000/users',           // 요청할 서버url
        async: true,            // 비동기화 여부 (default : true)
        dataType: 'json',       // 데이터 타입 (html, xml, json, text 등등)
        data: {},
        success: async function (result) { // 결과 성공 콜백함수
            result.forEach((result) => {
                if (result.id == userId) {
                    $("#first-name").text(result.firstName);
                }
            });
        }
    });
}

// 오늘의 질문 가져오기
$.support.cors = true;
async function setTodayQuestion(id) {
    let quesId = id;
    $.ajax({
        type: 'get',           // 타입 (get, post, put 등등)
        url: `http://localhost:3000/questions/${quesId}`,           // 요청할 서버url
        async: true,            // 비동기화 여부 (default : true)
        dataType: 'json',       // 데이터 타입 (html, xml, json, text 등등)
        data: {},
        success: async function (question) { // 결과 성공 콜백함수
            $("#question").text(question);
        }
    });
}

// 즐겨찾기 클릭 이벤트 
let isClicked = false;
async function isStarClicked(star = isClicked) {
    if (!star) {
        document.getElementsByClassName("important")[0].src = "./img/icon_filled_star_writing.svg";
        isClicked = true;
    } else {
        document.getElementsByClassName("important")[0].src = "./img/icon_star_writing.svg";
        isClicked = false;
    }
}

async function getSelfCheckScoreSum() {
    let sum = 0;
    sum += Number($(":input:radio[name=q1]:checked").val());
    sum += Number($(":input:radio[name=q2]:checked").val());
    sum += Number($(":input:radio[name=q3]:checked").val());
    sum += Number($(":input:radio[name=q4]:checked").val());
    return sum;
}

async function getStateImgSrc(score) {
    if (score >= 80) {
        return "./img/state_good.svg";
    } else if (score >= 46) {
        return "./img/state_normal.svg";
    } else {
        return "./img/state_bad.svg";
    }
}

// post new diary
async function createDiary() {
    await setSendBtn();
    // 비활성화 해제 
    await turnOffLock();

    let answer = $("#answer").val();
    if (answer === '')
        answer = ' ';
    let sum = await getSelfCheckScoreSum();// 총합
    let imgSrc = await getStateImgSrc(sum);
    let state = false;
    if (imgSrc === "./img/state_good.svg")
        state = true;
    let isStar = isClicked;

    const req = {
        "answer": answer,
        "star": isStar,
        "score": sum,
        "state": state,
        "companyId": Cookies.get("company_id")
    }

    let dateFormat = await getTodayDate(String(today));
    let day = dateFormat.substring(10, 12);
    let quesId;
    let pattern = /[0-9]/g;// 숫자 판별 정규표현식
    if (day[1].match(pattern) === null)// 한 자릿수의 일일 경우 뒷 부분 제거
        quesId = dateFormat.substring(10, 11);
    else
        quesId = dateFormat.substring(10, 12);// 두 자릿수의 일일 경우 전부 포함 

    console.log("answer: " + answer);
    console.log("sum: " + sum);
    console.log("imgSrc: " + imgSrc);
    console.log("state: " + state);
    console.log("isStar: " + isStar);
    console.log("quesId: " + quesId);
    console.log("userId: " + userId);

    axios.post(`http://localhost:3000/diaries/${userId}/${quesId}`, req)
        .then(async (result) => {
            if (result.data.data.state) {
                await saveGoodCount(result.data.data.companyId);
            }
            let id = result.data.data.id;
            await saveSelfCheckValue(id);// self check test result 각각의 값 저장
            location.href = "../list.html";

        }).catch((err) => {
            console.log(err);
        });

}

async function saveSelfCheckValue(id) {
    diaryId = id;
    let req = {
        "st_answer1": Number($(":input:radio[name=q1]:checked").val()),
        "st_answer2": Number($(":input:radio[name=q2]:checked").val()),
        "st_answer3": Number($(":input:radio[name=q3]:checked").val()),
        "st_answer4": Number($(":input:radio[name=q4]:checked").val())
    };

    await axios.post(`http://localhost:3000/self-test-results/${diaryId}`, req)
        .then(async (result) => {
            //console.log("st_answer1: " + result.data.st_answer1);

        }).catch((err) => {
            console.log("self test result 값 저장 실패: " + err);
        })
}

async function getSelfCheckValue(id) {
    await turnOnLock();
    diaryId = id;
    axios.get(`http://localhost:3000/self-test-results/${diaryId}`)
        .then(async (result) => {
            await setSelfCheckValueHtml(result.data.st_answer1, "q1");
            await setSelfCheckValueHtml(result.data.st_answer2, "q2");
            await setSelfCheckValueHtml(result.data.st_answer3, "q3");
            await setSelfCheckValueHtml(result.data.st_answer4, "q4");
        }).catch((err) => {
            console.log(err);
        })
}

// 가져온 self-check 값 저장된 위치에 넣기
async function setSelfCheckValueHtml(value, name) {
    let question = document.getElementsByName(name);
    let index = question.length - (value / 5);
    //console.log(question[index].checked);
    question[index].checked = true;
}

async function saveGoodCount(companyId) {
    let req = {};

    axios.patch(`http://localhost:3000/companies/${companyId}`, req)
        .then(async (result) => {
            console.log(result);
        }).catch((err) => {
            console.log(err);
        });
}

async function getDiaryData() {
    await setEditPageBtn();
    await setUserFirstName();
    axios.get(`http://localhost:3000/diaries/${userId}/${diaryId}`)
        .then(async (result) => {
            await setTodayQuestion(result.data.quesId);
            $("#answer").text(result.data.answer + " ");


            await getSelfCheckValue(result.data.id);
            await isStarClicked(!result.data.star);
        }).catch((err) => {
            console.log("문제 불러오기 실패" + err);
        });
}

// 비활성화
function turnOffLock() {
    $("#answer").attr("disabled", false);
    //$('#answer').css('caret-color', '');
    $("#important").attr("disabled", false);
    $("input:radio[name=q1]").attr("disabled", false);
    $("input:radio[name=q2]").attr("disabled", false);
    $("input:radio[name=q3]").attr("disabled", false);
    $("input:radio[name=q4]").attr("disabled", false);

    sendBtn.text("Send");
}

function turnOnLock() {
    $("#answer").attr("disabled", true);
    $('#answer').css('caret-color', 'transparent');
    $("#important").attr("disabled", true);
    $("input:radio[name=q1]").attr("disabled", true);
    $("input:radio[name=q2]").attr("disabled", true);
    $("input:radio[name=q3]").attr("disabled", true);
    $("input:radio[name=q4]").attr("disabled", true);

    sendBtn.text("Edit");
    sendBtn.prop('disabled', true); // 버튼 비활성화
}

function goDiaryViewPage() {
    turnOffLock();
    setEditBtn();
}

async function updateDiary() {

    let answer = $("#answer").val();
    if (answer === '')
        answer = ' ';
    let sum = await getSelfCheckScoreSum();// 총합
    let imgSrc = await getStateImgSrc(sum);
    let state = false;
    if (imgSrc === "./img/state_good.svg")
        state = true;
    let isStar = isClicked;

    const req = {
        "answer": answer,
        "star": isStar,
        "score": sum,
        "state": state,
        "companyId": Cookies.get("company_id")
    }

    axios.patch(`http://localhost:3000/diaries/${userId}/${diaryId}`, req)
        .then(async (result) => {
            console.log("수정됨");
        }).catch((err) => {
            console.log("수정되지 않음: " + err);
        });

}