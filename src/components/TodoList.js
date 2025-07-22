
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // ★「放送」を聞くためのフック
import { db } from '../firebase'; // ★Firebaseの設定
import { collection, query, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import dayjs from 'dayjs';

const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
const TodoList = () => {
    const { user } = useAuth();
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');
    const [newDueDate, setNewDueDate] = useState(''); // ★追加: 新規タスクの期日
    const [loading, setLoading] = useState(true);

    // ★追加: 編集用のstate
    const [editingTodoId, setEditingTodoId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDueDate, setEditDueDate] = useState('');

    // FirestoreからToDoリストをリアルタイムで取得
    useEffect(() => {
        if (!user) {
            setTodos([]);
            setLoading(false);
            return;
        };

        const userId = user.uid;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/todos`));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const todosData = [];
            querySnapshot.forEach((doc) => {
                todosData.push({ id: doc.id, ...doc.data() });
            });
            todosData.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            setTodos(todosData);
            setLoading(false);
        }, (error) => {
            console.error("ToDoの取得に失敗しました:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // ToDoを追加する処理
    const addTodo = async (e) => {
        e.preventDefault();
        if (newTodo.trim() === '' || !user) return;
        const userId = user.uid;
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/todos`), {
                text: newTodo,
                dueDate: newDueDate, // ★追加
                completed: false,
                createdAt: serverTimestamp(),
            });
            setNewTodo('');
            setNewDueDate(''); // ★追加
        } catch (error) {
            console.error("ToDoの追加に失敗しました:", error);
        }
    };

    // ToDoの完了状態を切り替える処理
    const toggleComplete = async (todo) => {
        if (!user) return;
        const userId = user.uid;
        const todoRef = doc(db, `artifacts/${appId}/users/${userId}/todos`, todo.id);
        try {
            await updateDoc(todoRef, { completed: !todo.completed });
        } catch (error) {
            console.error("ToDoの更新に失敗しました:", error);
        }
    };
    
    // ★追加: 編集モードを開始する処理
    const handleEdit = (todo) => {
        setEditingTodoId(todo.id);
        setEditText(todo.text);
        setEditDueDate(todo.dueDate || '');
    };

    // ★追加: 編集をキャンセルする処理
    const handleCancelEdit = () => {
        setEditingTodoId(null);
        setEditText('');
        setEditDueDate('');
    };

    // ★追加: ToDoを更新する処理
    const handleUpdateTodo = async (e) => {
        e.preventDefault();
        if (!user || !editingTodoId) return;
        const userId = user.uid;
        const todoRef = doc(db, `artifacts/${appId}/users/${userId}/todos`, editingTodoId);
        try {
            await updateDoc(todoRef, {
                text: editText,
                dueDate: editDueDate,
            });
            handleCancelEdit(); // 編集モードを終了
        } catch (error) {
            console.error("ToDoの更新に失敗しました:", error);
        }
    };


    // ToDoを削除する処理
    const deleteTodo = async (id) => {
        if (!user) return;
        const userId = user.uid;
        const todoRef = doc(db, `artifacts/${appId}/users/${userId}/todos`, id);
        try {
            await deleteDoc(todoRef);
        } catch (error) {
            console.error("ToDoの削除に失敗しました:", error);
        }
    };
    
    // ★追加: 日付のスタイルを決めるヘルパー関数
    const getDueDateStyle = (dueDateStr) => {
        if (!dueDateStr) return 'text-gray-400';
        const dueDate = dayjs(dueDateStr);
        const today = dayjs().startOf('day');
        if (dueDate.isBefore(today)) {
            return 'text-red-500 font-semibold'; // 期限切れ
        }
        if (dueDate.diff(today, 'day') <= 3) {
            return 'text-yellow-600 font-semibold'; // 3日以内
        }
        return 'text-gray-500';
    };


    return (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">やることリスト</h3>
            <form onSubmit={addTodo} className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="新しいタスクを追加..."
                    className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input 
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">追加</button>
            </form>
            {loading ? (
                <p className="text-gray-500">リストを読み込み中...</p>
            ) : (
                <ul className="space-y-2">
                    {todos.map((todo) => (
                        <li key={todo.id} className={`flex items-center p-3 rounded-lg transition-colors ${todo.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                            {editingTodoId === todo.id ? (
                                // --- 編集モード ---
                                <form onSubmit={handleUpdateTodo} className="flex-grow flex flex-col sm:flex-row items-center gap-2">
                                    <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-lg"/>
                                    <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="p-2 border border-gray-300 rounded-lg"/>
                                    <div className="flex gap-2">
                                        <button type="submit" className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">保存</button>
                                        <button type="button" onClick={handleCancelEdit} className="px-3 py-1 bg-gray-400 text-white text-sm rounded-md hover:bg-gray-500">キャンセル</button>
                                    </div>
                                </form>
                            ) : (
                                // --- 表示モード ---
                                <>
                                    <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"/>
                                    <div className={`flex-grow ml-3 ${todo.completed ? 'text-gray-400' : ''}`}>
                                        <span className={`${todo.completed ? 'line-through' : ''}`}>{todo.text}</span>
                                        {todo.dueDate && <p className={`text-xs ${getDueDateStyle(todo.dueDate)}`}>期日: {dayjs(todo.dueDate).format('YYYY/MM/DD')}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleEdit(todo)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                                      </button>
                                      <button onClick={() => deleteTodo(todo.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            
        </div>
        
    );
};

export default TodoList;