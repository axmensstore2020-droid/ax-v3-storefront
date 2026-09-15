'use client';
import {createContext,useContext} from 'react';
import {navigation,styleWorlds,seasonalCollections} from '../lib/navigation';
const Context=createContext({categories:navigation,styles:styleWorlds,seasons:seasonalCollections});
export default function NavigationProvider({value,children}) {return <Context.Provider value={value}>{children}</Context.Provider>;}
export const useNavigation=()=>useContext(Context);
