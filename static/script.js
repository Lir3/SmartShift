// 外部クリックで閉じるカスタムディレクティブ
// このディレクティブは、要素の外側がクリックされたときに特定の関数を実行します。
// 例: ドロップダウンリストが開いているときに、リスト外をクリックすると閉じる。
Vue.directive('click-outside', {
    // 要素がDOMにバインドされるときに呼び出されます
    bind(el, binding, vnode) {
        el.clickOutsideEvent = function (event) {
            // クリックが要素自体、または要素の子孫要素内で行われた場合は、何もしない
            if (el === event.target || el.contains(event.target)) {
                return;
            }
            // ドロップダウンリストが開いている場合のみ、binding.expression で指定されたメソッドを実行して閉じる
            // vnode.context は、このディレクティブが使用されているコンポーネントのインスタンスを参照します。
            // これにより、コンポーネントのデータ (例: 'open' プロパティ) やメソッドにアクセスできます。
            if (vnode.context.open) {
                vnode.context[binding.expression](event);
            }
        };
        // document.body にクリックイベントリスナーを追加します。
        // `true` (capture phase) を指定することで、イベントがターゲット要素に到達する前に処理されます。
        // これにより、一部のモバイルブラウザでのイベント競合問題を軽減できる可能性があります。
        document.body.addEventListener('click', el.clickOutsideEvent, true);
    },
    // 要素がDOMからアンバインドされるときに呼び出されます
    unbind(el) {
        // イベントリスナーを削除してメモリリークを防ぎます
        document.body.removeEventListener('click', el.clickOutsideEvent, true);
    },
});

// カスタムドロップダウンコンポーネント
// 時間選択などのプルダウンメニューとして機能します。
Vue.component("custom-dropdown", {
    // 親コンポーネントから受け取るプロパティ
    props: ["options", "value", "placeholder"],
    // コンポーネントのローカルデータ
    data() {
        return {
            open: false, // ドロップダウンリストが開いているかどうか
            selected: this.value || "", // 現在選択されている値
        };
    },
    // プロパティ 'value' の変更を監視
    watch: {
        value(val) {
            this.selected = val; // 親コンポーネントからの 'value' の変更をローカルデータに反映
        },
        selected(val) {
            this.$emit("input", val); // 'selected' が変更されたら、親コンポーネントに 'input' イベントを発行
        },
    },
    // コンポーネントのメソッド
    methods: {
        // ドロップダウンの開閉を切り替える
        toggle() {
            this.open = !this.open;
        },
        // オプションが選択されたときに呼び出される
        select(option) {
            this.selected = option; // 選択されたオプションをセット
            this.open = false; // ドロップダウンを閉じる
        },
        // ドロップダウンを閉じる
        close() {
            this.open = false;
        },
    },
    // コンポーネントのテンプレート (HTML構造)
    template: `
  <div class="dropdown" v-click-outside="close" tabindex="0" @blur="close">
    <div class="dropdown-label" @click="toggle" @touchstart.stop.prevent="toggle">
      {{ selected || placeholder }}
    </div>
    <div v-if="open" class="dropdown-list">
      <div v-for="option in options" :key="option" @click="select(option)" @touchstart.stop.prevent="select(option)">
        {{ option }}
      </div>
    </div>
  </div>
`,
});

// Vueアプリケーションのメインインスタンス
const app = new Vue({
    el: "#app", // このVueインスタンスがマウントされるDOM要素のID
    data: {
        // 曜日ごとのシフトデータを管理する配列
        weekdays: [
            { name: "月曜日", start_time: "", end_time: "", unavailable: false },
            { name: "火曜日", start_time: "", end_time: "", unavailable: false },
            { name: "水曜日", start_time: "", end_time: "", unavailable: false },
            { name: "木曜日", start_time: "", end_time: "", unavailable: false },
            { name: "金曜日", start_time: "", end_time: "", unavailable: false },
            { name: "土曜日", start_time: "", end_time: "", unavailable: false },
            { name: "日曜日", start_time: "", end_time: "", unavailable: false },
        ],
        timeOptions: [], // ドロップダウンの時間オプション
        userId: "", // LINEユーザーID
        userName: "", // LINE表示名
    },
    // インスタンスがマウントされた後に呼び出されるライフサイクルフック
    mounted() {
        // シフト設定データをサーバーから取得
        // このAPIは、勤務可能な開始時間、終了時間、シフトの単位（例: 15分ごと）を提供します。
        fetch("/lineShift/get_shift_config/")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const { opening_time, closing_time, shift_unit } = data;
                this.generateTimeOptions(opening_time, closing_time, shift_unit);
            })
            .catch(err => {
                console.error("設定データの取得に失敗しました:", err);
            });

        // LIFF (LINE Front-end Framework) の初期化とユーザープロファイルの取得
        // LIFF IDはLINE Developersコンソールで発行されたものを設定します。
        liff.init({ liffId: "2007279050-7DXAMK3D" }).then(() => {
            // ユーザーがLIFFにログインしていない場合、ログイン画面にリダイレクト
            if (!liff.isLoggedIn()) {
                liff.login();
            } else {
                // ログイン済みの場合は、ユーザープロファイル（ID、表示名など）を取得
                liff.getProfile().then(profile => {
                    this.userId = profile.userId;
                    this.userName = profile.displayName;
                });
            }
        }).catch(err => {
            console.error("LIFF初期化エラー:", err);
        });
    },
    methods: {
        // 開始時間、終了時間、シフト単位に基づいて時間オプションを生成する
        generateTimeOptions(startStr, endStr, unit) {
            const options = [];
            let [startH, startM] = startStr.split(":").map(Number); // 開始時刻を時と分に分解
            let [endH, endM] = endStr.split(":").map(Number); // 終了時刻を時と分に分解

            let start = startH * 60 + startM; // 開始時刻を分に変換
            let end = endH * 60 + endM; // 終了時刻を分に変換

            // 開始から終了まで、指定された単位で時間を生成
            for (let t = start; t <= end; t += unit) {
                const hh = String(Math.floor(t / 60)).padStart(2, '0'); // 時を2桁表示にフォーマット
                const mm = String(t % 60).padStart(2, '0'); // 分を2桁表示にフォーマット
                options.push(`${hh}:${mm}`); // "HH:MM" 形式でオプションに追加
            }

            this.timeOptions = options; // 生成されたオプションをデータにセット
        },
        // フォームの送信処理
        submitForm() {
            // 各曜日のシフト設定を検証
            for (let day of this.weekdays) {
                if (!day.unavailable) { // 出勤不可でない場合のみ検証
                    if (!day.start_time || !day.end_time) {
                        // alert は非推奨のため、代わりにコンソール出力やカスタムモーダルを使用
                        console.error(`${day.name}の勤務時間を入力してください`);
                        return; // 検証エラーがあれば処理を中断
                    }

                    // 時刻を整数に変換して比較
                    const start = parseInt(day.start_time.replace(':', ''), 10);
                    const end = parseInt(day.end_time.replace(':', ''), 10);
                    if (start >= end) {
                        // alert は非推奨のため、代わりにコンソール出力やカスタムモーダルを使用
                        console.error(`${day.name}の終了時刻は開始時刻より後にしてください`);
                        return; // 検証エラーがあれば処理を中断
                    }
                }
            }

            // シフトデータをサーバーに送信
            fetch("/lineShift/liff/submit_shift/", {
                method: "POST", // POSTリクエストを使用
                headers: {
                    "Content-Type": "application/json", // JSON形式でデータを送信
                    "ngrok-skip-browser-warning": "1", // ngrok使用時の警告をスキップ（開発用）
                },
                // シフトデータをJSON文字列に変換して送信
                body: JSON.stringify({
                    line_user_id: this.userId,
                    name: this.userName,
                    shifts: this.weekdays
                })
            }).then(response => {
                if (response.ok) { // レスポンスが正常（HTTPステータス200-299）の場合
                    // alert は非推奨のため、代わりにコンソール出力やカスタムモーダルを使用
                    console.log("保存完了！");
                    liff.closeWindow(); // LIFFウィンドウを閉じる
                } else { // レスポンスがエラーの場合
                    // alert は非推奨のため、代わりにコンソール出力やカスタムモーダルを使用
                    console.error("保存に失敗しました");
                }
            });
        }
    }
});
