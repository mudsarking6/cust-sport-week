import React,{createContext,useContext,useEffect,useState} from 'react';
import {Navigate,Route,Routes,useNavigate} from 'react-router-dom';
import {setOnUnauthorized} from './api';
import Layout from './components/Layout';
import {ConfirmationProvider} from './components/ConfirmationDialog';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Games from './pages/Games';
import Sheets from './pages/Sheets';
import SheetDetail from './pages/SheetDetail';
import Notifications from './pages/Notifications';
import Announcements from './pages/Announcements';
import Reminders from './pages/Reminders';
import Terms from './pages/Terms';
import BadgeStudio from './pages/BadgeStudio';
import TeamWins from './pages/TeamWins';

const Auth=createContext(); export const useAuth=()=>useContext(Auth);
export const Toast=createContext(); export const useToast=()=>useContext(Toast);
function AppLoader(){return <div className="app-loader"><span></span><p>Preparing your workspace…</p></div>}
function Guard({children}){const {user,loading}=useAuth();if(loading)return <AppLoader/>;return user?children:<Navigate to="/login" replace/>}

export default function App(){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const navigate=useNavigate();
  useEffect(()=>{
    const token=localStorage.getItem('cust_token');
    const savedUser=localStorage.getItem('cust_user');
    if(token&&savedUser){
      try{
        const restoredUser=JSON.parse(savedUser);
        if(restoredUser&&typeof restoredUser.id==='string'&&typeof restoredUser.baseRole==='string'){
          setUser(restoredUser);
        }else{
          localStorage.removeItem('cust_token');
          localStorage.removeItem('cust_user');
        }
      }catch(error){
        if(!(error instanceof SyntaxError))throw error;
        localStorage.removeItem('cust_token');
        localStorage.removeItem('cust_user');
      }
    }
    setLoading(false);
  },[]);
  const login=(token,u)=>{localStorage.setItem('cust_token',token);localStorage.setItem('cust_user',JSON.stringify(u));setUser(u)};
  const logout=()=>{localStorage.clear();setUser(null);navigate('/login',{replace:true})};
  const flash=(message,type='success')=>{setToast({message,type});setTimeout(()=>setToast(null),3200)};
  useEffect(()=>{setOnUnauthorized(()=>{logout();flash('Your session expired. Please sign in again.','error')})},[]);
  const operational=user?.baseRole!=='SUPER_ADMIN';
  return <Auth.Provider value={{user,loading,login,logout}}><Toast.Provider value={flash}><ConfirmationProvider>
    {toast&&<div className={`toast ${toast.type}`}>{toast.message}</div>}
    <Routes>
      <Route path="/" element={loading?<AppLoader/>:user?<Guard><Layout><Dashboard/></Layout></Guard>:<Welcome/>}/>
      <Route path="/login" element={loading?<AppLoader/>:user?<Navigate to="/" replace/>:<Login/>}/>
      <Route path="/*" element={<Guard><Layout><Routes>
        <Route index element={<Dashboard/>}/>
        <Route path="users" element={<Users/>}/>
        <Route path="games" element={operational?<Games/>:<Navigate to="/users" replace/>}/>
        <Route path="sheets" element={operational?<Sheets/>:<Navigate to="/users" replace/>}/>
        <Route path="sheets/:id" element={operational?<SheetDetail/>:<Navigate to="/users" replace/>}/>
        <Route path="terms" element={operational?<Terms/>:<Navigate to="/users" replace/>}/>
        <Route path="terms/:id" element={operational?<Terms/>:<Navigate to="/users" replace/>}/>
        <Route path="badges" element={user?.displayRole==='Support Coordinator'?<BadgeStudio/>:<Navigate to="/" replace/>}/>
        <Route path="team-wins" element={operational?<TeamWins/>:<Navigate to="/users" replace/>}/>
        <Route path="reminders" element={<Reminders/>}/>
        <Route path="announcements" element={<Announcements/>}/>
        <Route path="notifications" element={<Notifications/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes></Layout></Guard>}/>
    </Routes>
  </ConfirmationProvider></Toast.Provider></Auth.Provider>;
}
