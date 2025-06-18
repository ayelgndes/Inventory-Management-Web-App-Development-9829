import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const useSupabase = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runQuery = async (query, params = []) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: supabaseError } = await supabase.rpc(query, params)
      
      if (supabaseError) {
        throw supabaseError
      }
      
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const insertData = async (table, data) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: result, error: supabaseError } = await supabase
        .from(table)
        .insert(data)
        .select()
      
      if (supabaseError) {
        throw supabaseError
      }
      
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateData = async (table, id, data) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: result, error: supabaseError } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
      
      if (supabaseError) {
        throw supabaseError
      }
      
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async (table, filters = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase.from(table).select('*')
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value)
        }
      })
      
      const { data, error: supabaseError } = await query
      
      if (supabaseError) {
        throw supabaseError
      }
      
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    runQuery,
    insertData,
    updateData,
    fetchData
  }
}